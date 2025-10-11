import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { 
  createProject, 
  renameProject, 
  listProjects, 
  getProject 
} from '../core/projects';

export function registerProjectTools(mcpServer: McpServer) {
  // Create Project
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

  // Rename Project
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

  // List Projects
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

  // Get Project Details
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
}