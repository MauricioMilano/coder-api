import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as taskCore from '../core/tasks';
import { Task } from '../types/task';

interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority?: number;
  dueDate?: string; // ISO 8601 format
}

interface GetTaskRequest {
  projectId: string;
  taskId: string;
}

interface ListTasksRequest {
  projectId: string;
}

interface UpdateTaskRequest {
  projectId: string;
  taskId: string;
  title?: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority?: number;
  dueDate?: string; // ISO 8601 format
}

interface DeleteTaskRequest {
  projectId: string;
  taskId: string;
}

export const registerMcpTaskTools = (mcpServer: McpServer) => {
  const createTaskHandler = async (input: CreateTaskRequest) => {
    const taskDataToCreate = { ...input, status: input.status || 'pending' };
    const task = await taskCore.createTask(input.projectId, taskDataToCreate);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ task }, null, 2)
      }]
    };
  };

  mcpServer.registerTool('create_task', {
    description: 'Create a new task within a project',
    inputSchema: {
      projectId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).optional(),
      priority: z.number().optional(),
      dueDate: z.string().optional(),
    },
  }, createTaskHandler);

  const getTaskHandler = async (input: GetTaskRequest) => {
    const task = await taskCore.getTask(input.projectId, input.taskId);
    if (!task) {
      throw new Error(`Task with ID '${input.taskId}' not found in project '${input.projectId}'`);
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ task }, null, 2)
      }]
    };
  };

  mcpServer.registerTool('get_task', {
    description: 'Get details of a specific task from a project',
    inputSchema: {
      projectId: z.string(),
      taskId: z.string(),
    },
  }, getTaskHandler);

  const listTasksHandler = async (input: ListTasksRequest) => {
    const tasks = await taskCore.listTasks(input.projectId);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ tasks }, null, 2)
      }]
    };
  };

  mcpServer.registerTool('list_tasks', {
    description: 'List all tasks for a given project',
    inputSchema: {
      projectId: z.string(),
    },
  }, listTasksHandler);

  const updateTaskHandler = async (input: UpdateTaskRequest) => {
    const { projectId, taskId, ...updatedData } = input;
    const task = await taskCore.updateTask(projectId, taskId, updatedData);
    if (!task) {
      throw new Error(`Task with ID '${taskId}' not found in project '${projectId}'`);
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ task }, null, 2)
      }]
    };
  };

  mcpServer.registerTool('update_task', {
    description: 'Update an existing task in a project',
    inputSchema: {
      projectId: z.string(),
      taskId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).optional(),
      priority: z.number().optional(),
      dueDate: z.string().optional(),
    },
  }, updateTaskHandler);

  const deleteTaskHandler = async (input: DeleteTaskRequest) => {
    const success = await taskCore.deleteTask(input.projectId, input.taskId);
    if (!success) {
      throw new Error(`Task with ID '${input.taskId}' not found in project '${input.projectId}'`);
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true }, null, 2)
      }]
    };
  };

  mcpServer.registerTool('delete_task', {
    description: 'Delete a task from a project',
    inputSchema: {
      projectId: z.string(),
      taskId: z.string(),
    },
  }, deleteTaskHandler);
};
