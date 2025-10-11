import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getProject } from '../core/projects';
import { listFiletree, FiletreeOptions } from '../core/filetree';

export function registerFiletreeTools(mcpServer: McpServer) {
  // List File Tree
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
}