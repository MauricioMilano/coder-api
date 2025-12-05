import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types/task';
import { config } from '../config';

const getProjectTasksDir = (projectId: string) => {
  return path.join(config.workspaceRoot, projectId, 'tasks');
};

const getTaskFilePath = (projectId: string, taskId: string) => {
  return path.join(getProjectTasksDir(projectId), `\${taskId}.json`);
};

export const createTask = async (projectId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
  const tasksDir = getProjectTasksDir(projectId);
  await fs.mkdir(tasksDir, { recursive: true });

  const taskId = uuidv4();
  const now = new Date().toISOString();
  const newTask: Task = {
    id: taskId,
    ...taskData,
    status: taskData.status || 'pending', // Default status
    createdAt: now,
    updatedAt: now,
  };

  const filePath = getTaskFilePath(projectId, taskId);
  await fs.writeFile(filePath, JSON.stringify(newTask, null, 2));
  return newTask;
};

export const getTask = async (projectId: string, taskId: string): Promise<Task | null> => {
  const filePath = getTaskFilePath(projectId, taskId);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Task;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const listTasks = async (projectId: string): Promise<Task[]> => {
  const tasksDir = getProjectTasksDir(projectId);
  try {
    const files = await fs.readdir(tasksDir);
    const taskFiles = files.filter(file => file.endsWith('.json'));
    const tasks: Task[] = [];
    for (const file of taskFiles) {
      const taskId = path.basename(file, '.json');
      const task = await getTask(projectId, taskId);
      if (task) {
        tasks.push(task);
      }
    }
    return tasks;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

export const updateTask = async (projectId: string, taskId: string, updatedData: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task | null> => {
  const existingTask = await getTask(projectId, taskId);
  if (!existingTask) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedTask: Task = {
    ...existingTask,
    ...updatedData,
    updatedAt: now,
  };

  const filePath = getTaskFilePath(projectId, taskId);
  await fs.writeFile(filePath, JSON.stringify(updatedTask, null, 2));
  return updatedTask;
};

export const deleteTask = async (projectId: string, taskId: string): Promise<boolean> => {
  const filePath = getTaskFilePath(projectId, taskId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};