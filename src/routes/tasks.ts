
import { Router, Request, Response } from 'express';
import * as taskCore from '../core/tasks';
import { Task } from '../types/task';

const router = Router();

router.post<any, any, Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, { projectId: string }>
('/', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const taskData = req.body;
  try {
    const newTask = await taskCore.createTask(projectId, taskData);
    res.status(201).json(newTask);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
});

router.get<any, any, any, { projectId: string, taskId: string }>
('/:taskId', async (req: Request, res: Response) => {
  const { projectId, taskId } = req.params;
  try {
    const task = await taskCore.getTask(projectId, taskId);
    if (task) {
      res.status(200).json(task);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to retrieve task', error: error.message });
  }
});

router.get<any, any, any, { projectId: string }>
('/', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const tasks = await taskCore.listTasks(projectId);
    res.status(200).json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to list tasks', error: error.message });
  }
});

router.put<any, any, Partial<Omit<Task, 'id' | 'createdAt'>>, { projectId: string, taskId: string }>
('/:taskId', async (req: Request, res: Response) => {
  const { projectId, taskId } = req.params;
  const updatedData = req.body;
  try {
    const updatedTask = await taskCore.updateTask(projectId, taskId, updatedData);
    if (updatedTask) {
      res.status(200).json(updatedTask);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update task', error: error.message });
  }
});

router.delete<any, any, any, { projectId: string, taskId: string }>
('/:taskId', async (req: Request, res: Response) => {
  const { projectId, taskId } = req.params;
  try {
    const success = await taskCore.deleteTask(projectId, taskId);
    if (success) {
      res.status(204).send(); // No content for successful deletion
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
});

export default router;
