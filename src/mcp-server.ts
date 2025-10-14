import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
import { generateSshKey, getPublicSshKey } from './core/ssh';
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
            exit_code: z.number().nullable(),
            duration_ms: z.number(),
            truncated: z.object({
                stdout: z.boolean(),
                stderr: z.boolean()
            })
        }
    },
    async ({ projectId, command, workdir, timeout_sec, env }) => {
        try {
            const result = await runBashCommand(projectId, { command, workdir, timeout_sec, env });
            const { stdout, stderr, exit_code, duration_ms, truncated } = result;
            return {
                content: [{ type: 'text', text: JSON.stringify({ stdout, stderr, exit_code, duration_ms, truncated }) }],
                structuredContent: { stdout, stderr, exit_code, duration_ms, truncated }
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
                isError: true
            };
        }
    }
);

// 4. Data Retrieval Tools (converted from resources to tools)

mcpServer.registerTool(
  'list-projects',
  {
    title: 'List Projects',
    description: 'Get a list of all projects',
    inputSchema: {},
    outputSchema: {
      projects: z.array(z.object({
        id: z.string(),
        name: z.string(),
        rootAbsPath: z.string()
      }))
    }
  },
  async () => {
    try {
      const projects = await listProjects();
      return {
        content: [{ type: 'text', text: JSON.stringify({ projects }, null, 2) }],
        structuredContent: { projects }
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
  'get-project-details',
  {
    title: 'Get Project Details',
    description: 'Get detailed information about a specific project',
    inputSchema: {
      projectId: z.string()
    },
    outputSchema: {
      id: z.string(),
      name: z.string(),
      rootAbsPath: z.string()
    }
  },
  async ({ projectId }) => {
    try {
      const project = await getProject(projectId);
      return {
        content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
        structuredContent: project
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
  'list-filetree',
  {
    title: 'List File Tree',
    description: 'Get the file tree structure of a project',
    inputSchema: {
      projectId: z.string(),
      path: z.string().default('/'),
      depth: z.number().default(2),
      maxEntries: z.number().default(2000)
    },
    outputSchema: {
      files: z.array(z.string()),
      truncated: z.boolean()
    }
  },
  async ({ projectId, path = '/', depth = 2, maxEntries = 2000 }) => {
    try {
      const project = await getProject(projectId);
      const options: FiletreeOptions = {
        path,
        depth,
        max_entries: maxEntries
      };
      const result = await listFiletree(project, options);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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

// Export the server for use in other modules
export { mcpServer };
// 5. SSH Tools (conditional)
if (config.sshEnabled) {
  mcpServer.registerTool(
    'ssh-keygen',
    {
      title: 'Generate SSH key',
      description: 'Generate a new SSH key in the project .ssh directory',
      inputSchema: {
        projectId: z.string(),
        type: z.enum(['ed25519','rsa']).default('ed25519'),
        bits: z.number().default(4096),
        comment: z.string().default('coder-api'),
        overwrite: z.boolean().default(false)
      },
      outputSchema: {
        generated: z.boolean(),
        private_key_path: z.string(),
        public_key_path: z.string(),
        public_key: z.string(),
        stdout: z.string(),
        stderr: z.string()
      }
    },
    async ({ projectId, type, bits, comment, overwrite }) => {
      try {
        const project = await getProject(projectId);
        const result = await generateSshKey(project, { type, bits, comment, overwrite });
        return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }], isError: true };
      }
    }
  );

  mcpServer.registerTool(
    'ssh-public-key',
    {
      title: 'Read public SSH key',
      description: 'Read the public SSH key from the project .ssh directory',
      inputSchema: {
        projectId: z.string(),
        type: z.enum(['ed25519','rsa']).default('ed25519')
      },
      outputSchema: {
        type: z.string(),
        public_key_path: z.string(),
        public_key: z.string()
      }
    },
    async ({ projectId, type }) => {
      try {
        const project = await getProject(projectId);
        const result = await getPublicSshKey(project, { type });
        return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }], isError: true };
      }
    }
  );
}
