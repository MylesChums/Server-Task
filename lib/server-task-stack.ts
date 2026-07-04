import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class ServerTaskStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tasksTable = new dynamodb.Table(this, 'TasksTable', {
      partitionKey: { name: 'taskId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // dev only — don't do this in production
    });

    tasksTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const taskAttachmentsBucket = new s3.Bucket(this, 'TaskAttachmentsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // dev only — lets cdk destroy actually empty the bucket
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ['http://localhost:3000'], // your local frontend
          allowedHeaders: ['*'],
        },
      ],
    });

    const taskLambdaRole = new iam.Role(this, 'TaskLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    tasksTable.grantReadWriteData(taskLambdaRole);
    taskAttachmentsBucket.grantReadWrite(taskLambdaRole);
    taskLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['rekognition:DetectLabels'],
        resources: ['*'], // Rekognition doesn't support resource-level permissions for DetectLabels
      })
    );

    const taskFunction = new lambdaNodejs.NodejsFunction(this, 'TaskFunction', {
      entry: path.join(__dirname, '../lambda/tasks/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      role: taskLambdaRole,
      environment: {
        TABLE_NAME: tasksTable.tableName,
        BUCKET_NAME: taskAttachmentsBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    const api = new apigateway.RestApi(this, 'TaskApi', {
      restApiName: 'ServerTask API',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const integration = new apigateway.LambdaIntegration(taskFunction);

    const tasks = api.root.addResource('tasks');
    tasks.addMethod('GET', integration); // list tasks
    tasks.addMethod('POST', integration); // create task

    const task = tasks.addResource('{taskId}');
    task.addMethod('GET', integration); // get one task
    task.addMethod('PUT', integration); // update task
    task.addMethod('DELETE', integration); // delete task

    const processImage = task.addResource('process-image');
    processImage.addMethod('POST', integration); // trigger Rekognition analysis
  }
}