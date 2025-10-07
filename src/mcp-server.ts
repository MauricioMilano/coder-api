import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';
import { config } from './config';
import { 
  createProject, 
  renameProject, 
  listProjects, 
  getProject 
} from './core/projects';
import { 
  getFile, 
  createFile, 
  deleteFile, 
  patchFile 
} from './core/files';
import { runBashCommand } from './core/bash';
import { listFiletree, FiletreeOptions } from './core/filetree';

// Create the MCP server
const mcpServer = new McpServer({
  name: 'coder-api-mcp',
  version: '1.0.0'
});

// TOOLS - Actions that the LLM can perform

// 1. Project Management Tools
mcpServer.registerTool(
  'create-project',
  {
    title: 'Create Project',
    description: 'Create a new project from Git repository, archive, or empty directory',
    inputSchema: {
      source: z.object({
        git: z.object({
          url: z.string(),
          branch: z.string().optional(),
          depth: z.number().optional(),
          token_env: z.string().optional()
        }).optional(),
        local: z.boolean().optional(),
        adopt: z.boolean().optional()
      }),
      name: z.string(),
      idemKey: z.string().optional()
    },
    outputSchema: {
      project_id: z.string(),
      root: z.string()
    }
  },
  async ({ source, name, idemKey }) => {
    try {
      const result = await createProject(source, name, idemKey);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
        isError: true
      };
    }
  }
);

mcpServer.registerTool(
  'rename-project',
  {
    title: 'Rename Project',
    description: 'Rename an existing project',
    inputSchema: {
      projectId: z.string(),
      newName: z.string()
    },
    outputSchema: {
      project_id: z.string(),
      name: z.string(),
      root: z.string()
    }
  },
  async ({ projectId, newName }) => {
    try {
      const result = await renameProject(projectId, newName);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
        isError: true
      };
    }
  }
);

// 2. File Management Tools
mcpServer.registerTool(
  'get-file',
  {
    title: 'Get File Content',
    description: 'Read the content of a file in a project',
    inputSchema: {
      projectId: z.string(),
      filePath: z.string(),
      encoding: z.enum(['text', 'base64']).default('text')
    },
    outputSchema: {
      path: z.string(),
      content: z.string(),
      hash: z.string()
    }
  },
  async ({ projectId, filePath, encoding }) => {
    try {
      const project = await getProject(projectId);
      const result = await getFile(project, filePath, encoding);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
        isError: true
      };
    }
  }
);

mcpServer.registerTool(
  'create-file',
  {
    title: 'Create File',
    description: 'Create a new file in a project',
    inputSchema: {
      projectId: z.string(),
      path: z.string(),
      content: z.string(),
      encoding: z.enum(['text', 'base64']).default('text'),
      overwrite: z.boolean().default(false)
    },
    outputSchema: {
      path: z.string(),
      hash: z.string()
    }
  },
  async ({ projectId, path, content, encoding, overwrite }) => {
    try {
      const project = await getProject(projectId);
      const result = await createFile(project, { path, content, encoding, overwrite });
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
        isError: true
      };
    }
  }
);

mcpServer.registerTool(
  'delete-file',
  {
    title: 'Delete File',
    description: 'Delete a file or directory in a project',
    inputSchema: {
      projectId: z.string(),
      path: z.string(),
      recursive: z.boolean().default(false),
      missing_ok: z.boolean().default(false)
    },
    outputSchema: {
      deleted: z.boolean()
    }
  },
  async ({ projectId, path, recursive, missing_ok }) => {
    try {
      const project = await getProject(projectId);
      const result = await deleteFile(project, { path, recursive, missing_ok });
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
        isError: true
      };
    }
  }
);

mcpServer.registerTool(
  'patch-file',
  {
    title: 'Patch File',
    description: 'Apply modifications to a file using various patch operations',
    inputSchema: {
      projectId: z.string(),
      path: z.string(),
      operation: z.object({
        type: z.enum(['diff', 'replace', 'lines', 'insert', 'code_block']),
        // Additional fields depend on operation type
      }),
      expected_hash: z.string().optional(),
      preview: z.boolean().default(false)
    },
    outputSchema: {
      path: z.string(),
      hash: z.string().optional(),
      preview: z.boolean().optional(),
      stats: z.object({}).optional()
    }
  },
  async ({ projectId, path, operation, expected_hash, preview }) => {
    try {
      const project = await getProject(projectId);
      const result = await patchFile(project, { path, operation, expected_hash, preview });
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
        isError: true
      };
    }
  }
);

// 3. Bash Command Tool
mcpServer.registerTool(
  'run-bash',
  {
    title: 'Run Bash Command',
    description: 'Execute a bash command in a project directory',
    inputSchema: {
      projectId: z.string(),
      command: z.string(),
      workdir: z.string().default('/'),
      timeout_sec: z.number().default(120),
      env: z.record(z.string()).optional()
    },
    outputSchema: {
      stdout: z.string(),
      stderr: z.string(),
      exit_code: z.number(),
      timed_out: z.boolean()
    }
  },
  async ({ projectId, command, workdir, timeout_sec, env }) => {
    try {
      const result = await runBashCommand(projectId, { command, workdir, timeout_sec, env });
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
        isError: true
      };
    }
  }
);

// RESOURCES - Data that can be read by the LLM

// 1. Projects List Resource
mcpServer.registerResource(
  'projects',
  'projects://list',
  {
    title: 'Projects List',
    description: 'List of all projects',
    mimeType: 'application/json'
  },
  async (uri) => {
    try {
      const projects = await listProjects();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(projects, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error: ${error.message || JSON.stringify(error)}`
          }
        ]
      };
    }
  }
);

// 2. Project Details Resource
mcpServer.registerResource(
  'project-details',
  new ResourceTemplate('project://{projectId}', { list: undefined }),
  {
    title: 'Project Details',
    description: 'Details of a specific project'
  },
  async (uri, { projectId }) => {
    try {
      const project = await getProject(Array.isArray(projectId) ? projectId[0] : projectId);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(project, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error: ${error.message || JSON.stringify(error)}`
          }
        ]
      };
    }
  }
);

// 3. File Tree Resource
mcpServer.registerResource(
  'filetree',
  new ResourceTemplate('filetree://{projectId}?path={path}&depth={depth}', { 
    list: undefined,
    complete: {
      path: (value) => ['/src', '/docs', '/test', '/lib'].filter(p => p.startsWith(value)),
      depth: (value) => ['1', '2', '3', '4', '5'].filter(d => d.startsWith(value))
    }
  }),
  {
    title: 'Project File Tree',
    description: 'File tree structure of a project'
  },
  async (uri, { projectId, path = '/', depth = '2' }) => {
    try {
      const project = await getProject(Array.isArray(projectId) ? projectId[0] : projectId);
      const pathStr = Array.isArray(path) ? path[0] : path;
      const depthStr = Array.isArray(depth) ? depth[0] : depth;
      const options: FiletreeOptions = {
        path: pathStr,
        depth: parseInt(depthStr, 10),
        max_entries: 2000
      };
      const result = await listFiletree(project, options);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error: ${error.message || JSON.stringify(error)}`
          }
        ]
      };
    }
  }
);

// 4. File Content Resource
mcpServer.registerResource(
  'file-content',
  new ResourceTemplate('file://{projectId}/{filePath}', { list: undefined }),
  {
    title: 'File Content',
    description: 'Content of a specific file in a project'
  },
  async (uri, { projectId, filePath }) => {
    try {
      const project = await getProject(Array.isArray(projectId) ? projectId[0] : projectId);
      const filePathStr = Array.isArray(filePath) ? filePath[0] : filePath;
      const result = await getFile(project, filePathStr, 'text');
      return {
        contents: [
          {
            uri: uri.href,
            text: result.content,
            mimeType: 'text/plain'
          }
        ]
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error: ${error.message || JSON.stringify(error)}`
          }
        ]
      };
    }
  }
);

// Export the server for use in other modules
export { mcpServer };