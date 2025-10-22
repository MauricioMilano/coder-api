import { z } from 'zod';
import { tool } from 'ai';
import { coderAPI } from '@/lib/api/coder-client';

// Tool for listing projects
export const listProjectsTool = tool({
  description: 'List all available projects in the workspace',
  parameters: z.object({}),
  execute: async () => {
    const response = await coderAPI.listProjects();
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to list projects');
    }
    return response.data;
  },
});

// Tool for getting project details
export const getProjectTool = tool({
  description: 'Get details about a specific project',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
  }),
  execute: async ({ projectId }) => {
    const response = await coderAPI.getProject(projectId);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get project');
    }
    return response.data;
  },
});

// Tool for reading files
export const readFileTool = tool({
  description: 'Read the contents of a file in the project',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
    path: z.string().describe('The file path relative to project root'),
  }),
  execute: async ({ projectId, path }) => {
    const response = await coderAPI.getFile(projectId, path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to read file');
    }
    return response.data;
  },
});

// Tool for creating files
export const createFileTool = tool({
  description: 'Create a new file in the project',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
    path: z.string().describe('The file path relative to project root'),
    content: z.string().describe('The file content'),
    createParents: z
      .boolean()
      .optional()
      .describe('Create parent directories if they do not exist'),
  }),
  execute: async ({ projectId, path, content, createParents }) => {
    const response = await coderAPI.createFile(projectId, {
      path,
      content,
      create_parents: createParents,
      encoding: 'text',
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create file');
    }
    return { success: true, path };
  },
});

// Tool for editing files
export const editFileTool = tool({
  description: 'Edit an existing file using find and replace',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
    path: z.string().describe('The file path relative to project root'),
    find: z.string().describe('The text to find'),
    replace: z.string().describe('The text to replace it with'),
    all: z
      .boolean()
      .optional()
      .describe('Replace all occurrences (default: false)'),
  }),
  execute: async ({ projectId, path, find, replace, all }) => {
    const response = await coderAPI.patchFile(projectId, {
      path,
      operation: {
        type: 'replace',
        find,
        replace,
        all: all || false,
      },
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to edit file');
    }
    return { success: true, path };
  },
});

// Tool for listing file tree
export const listFileTreeTool = tool({
  description: 'List the file tree structure of a project directory',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
    path: z.string().optional().describe('The directory path (default: /)'),
    depth: z
      .number()
      .optional()
      .describe('The depth of the tree to return (default: 2)'),
  }),
  execute: async ({ projectId, path, depth }) => {
    const response = await coderAPI.listFileTree(
      projectId,
      path || '/',
      depth || 2
    );
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to list file tree');
    }
    return response.data;
  },
});

// Tool for searching code
export const searchCodeTool = tool({
  description: 'Search for text or patterns across files in the project',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
    query: z.string().describe('The search query'),
    regex: z.boolean().optional().describe('Use regex for search'),
    caseSensitive: z.boolean().optional().describe('Case sensitive search'),
  }),
  execute: async ({ projectId, query, regex, caseSensitive }) => {
    const response = await coderAPI.search(projectId, {
      query,
      regex: regex || false,
      case_sensitive: caseSensitive || false,
      max_results: 50,
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to search');
    }
    return response.data;
  },
});

// Tool for running bash commands
export const runCommandTool = tool({
  description: 'Execute a bash command in the project directory',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
    command: z.string().describe('The bash command to execute'),
    workdir: z
      .string()
      .optional()
      .describe('Working directory (relative to project root)'),
    timeoutSec: z.number().optional().describe('Timeout in seconds'),
  }),
  execute: async ({ projectId, command, workdir, timeoutSec }) => {
    const response = await coderAPI.runBash(projectId, {
      command,
      workdir: workdir || '/',
      timeout_sec: timeoutSec || 30,
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to run command');
    }
    return response.data;
  },
});

// Tool for starting applications with PM2
export const startAppTool = tool({
  description: 'Start an application using PM2 process manager',
  parameters: z.object({
    projectId: z.string().describe('The project ID'),
    name: z.string().describe('Application name'),
    script: z.string().describe('Script to run (e.g., index.js)'),
    cwd: z.string().optional().describe('Working directory'),
    env: z.record(z.string()).optional().describe('Environment variables'),
  }),
  execute: async ({ projectId, name, script, cwd, env }) => {
    const response = await coderAPI.pm2Start(projectId, {
      name,
      script,
      cwd,
      env,
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to start app');
    }
    return { success: true, message: `Started ${name}` };
  },
});

// Collect all tools
export const tools = {
  list_projects: listProjectsTool,
  get_project: getProjectTool,
  read_file: readFileTool,
  create_file: createFileTool,
  edit_file: editFileTool,
  list_file_tree: listFileTreeTool,
  search_code: searchCodeTool,
  run_command: runCommandTool,
  start_app: startAppTool,
};

export type ToolName = keyof typeof tools;
