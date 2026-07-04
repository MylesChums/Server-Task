import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const rekognition = new RekognitionClient({});

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { resource, httpMethod } = event;
    const taskId = event.pathParameters?.taskId;
    const userId = event.queryStringParameters?.userId;
    const body = event.body ? JSON.parse(event.body) : {};

    if (resource === '/tasks' && httpMethod === 'POST') {
      return await createTask(body);
    }
    if (resource === '/tasks' && httpMethod === 'GET') {
      return await listTasks(userId);
    }
    if (resource === '/tasks/{taskId}' && httpMethod === 'GET') {
      return await getTask(taskId!, userId);
    }
    if (resource === '/tasks/{taskId}' && httpMethod === 'PUT') {
      return await updateTask(taskId!, body);
    }
    if (resource === '/tasks/{taskId}' && httpMethod === 'DELETE') {
      return await deleteTask(taskId!, userId);
    }
    if (resource === '/tasks/{taskId}/process-image' && httpMethod === 'POST') {
      return await processImage(taskId!, body);
    }

    return json(404, { message: `No route for ${httpMethod} ${resource}` });
  } catch (err) {
    console.error('Unhandled error', err);
    return json(500, { message: 'Internal server error' });
  }
};

// Demo-scope note: there's no auth service (e.g. Cognito) in this stack, so
// userId is passed explicitly by the client instead of being derived from a
// verified identity. Fine for a portfolio demo; a real deployment would pull
// userId from event.requestContext.authorizer instead.

async function createTask(body: any) {
  const { userId, title, description, dueDate, hasImage } = body;
  if (!userId || !title) {
    return json(400, { message: 'userId and title are required' });
  }

  const taskId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const imageKey = hasImage ? `${userId}/${taskId}` : undefined;

  const item = {
    taskId,
    userId,
    title,
    description: description ?? '',
    dueDate: dueDate ?? null,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    imageKey: imageKey ?? null,
    imageLabels: [] as string[],
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  let imageUploadUrl: string | undefined;
  if (imageKey) {
    imageUploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: imageKey }),
      { expiresIn: 300 }
    );
  }

  return json(201, { ...item, imageUploadUrl });
}

async function listTasks(userId?: string) {
  if (!userId) {
    return json(400, { message: 'userId query parameter is required' });
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false, // newest first
    })
  );

  return json(200, result.Items ?? []);
}

async function getTask(taskId: string, userId?: string) {
  if (!userId) {
    return json(400, { message: 'userId query parameter is required' });
  }

  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { taskId, userId } })
  );

  if (!result.Item) {
    return json(404, { message: 'Task not found' });
  }
  return json(200, result.Item);
}

async function updateTask(taskId: string, body: any) {
  const { userId, title, description, dueDate, status } = body;
  if (!userId) {
    return json(400, { message: 'userId is required' });
  }

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { taskId, userId },
      UpdateExpression:
        'set title = :title, description = :description, dueDate = :dueDate, #taskStatus = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#taskStatus': 'status', // "status" is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ':title': title,
        ':description': description ?? '',
        ':dueDate': dueDate ?? null,
        ':status': status ?? 'pending',
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return json(200, result.Attributes);
}

async function deleteTask(taskId: string, userId?: string) {
  if (!userId) {
    return json(400, { message: 'userId query parameter is required' });
  }

  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { taskId, userId } }));
  return json(204, {});
}

async function processImage(taskId: string, body: any) {
  const { userId } = body;
  if (!userId) {
    return json(400, { message: 'userId is required' });
  }

  const existing = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { taskId, userId } })
  );
  if (!existing.Item || !existing.Item.imageKey) {
    return json(404, { message: 'Task or image not found' });
  }

  const rekognitionResult = await rekognition.send(
    new DetectLabelsCommand({
      Image: { S3Object: { Bucket: BUCKET_NAME, Name: existing.Item.imageKey } },
      MaxLabels: 10,
      MinConfidence: 75,
    })
  );

  const labels = (rekognitionResult.Labels ?? []).map((l) => l.Name).filter(Boolean);

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { taskId, userId },
      UpdateExpression: 'set imageLabels = :labels, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':labels': labels,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return json(200, result.Attributes);
}
