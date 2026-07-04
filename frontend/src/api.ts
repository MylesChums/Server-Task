import axios from 'axios';
import { CURRENT_USER_ID } from './config';
import { CreateTaskInput, Task, UpdateTaskInput } from './types';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL });

export const listTasks = async (): Promise<Task[]> => {
  const response = await api.get<Task[]>('/tasks', {
    params: { userId: CURRENT_USER_ID },
  });
  return response.data;
};

export const getTask = async (taskId: string): Promise<Task> => {
  const response = await api.get<Task>(`/tasks/${taskId}`, {
    params: { userId: CURRENT_USER_ID },
  });
  return response.data;
};

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const response = await api.post<Task>('/tasks', {
    userId: CURRENT_USER_ID,
    ...input,
  });
  return response.data;
};

export const updateTask = async (taskId: string, input: UpdateTaskInput): Promise<Task> => {
  const response = await api.put<Task>(`/tasks/${taskId}`, {
    userId: CURRENT_USER_ID,
    ...input,
  });
  return response.data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}`, {
    params: { userId: CURRENT_USER_ID },
  });
};

export const uploadImage = async (uploadUrl: string, file: File): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }
};

export const processImage = async (taskId: string): Promise<Task> => {
  const response = await api.post<Task>(`/tasks/${taskId}/process-image`, {
    userId: CURRENT_USER_ID,
  });
  return response.data;
};
