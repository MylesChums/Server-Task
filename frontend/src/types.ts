export interface Task {
  taskId: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
  imageKey: string | null;
  imageLabels: string[];
  imageUploadUrl?: string;
  imageViewUrl?: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  dueDate: string | null;
  hasImage: boolean;
}

export interface UpdateTaskInput {
  title: string;
  description: string;
  dueDate: string | null;
  status: Task['status'];
  requestImageUpload?: boolean;
}
