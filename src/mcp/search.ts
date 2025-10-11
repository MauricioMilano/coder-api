import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getProject } from '../core/projects';
import { searchInProject } from '../core/search';

export function registerSearchTools(mcpServer: McpServer) {
  // Search in Project
  mcpServer.registerTool(
    'search',
    {
      title: 'Search in project',
      description: 'Search text across files in a project',
      inputSchema: {
        projectId: z.string(),
        path: z.string().default('/'),
        query: z.string().min(1),
        regex: z.boolean().default(false),
        case_sensitive: z.boolean().default(false),
        max_results: z.number().default(200)
      },
      outputSchema: {
        results: z.array(z.object({
          file: z.string(),
          line: z.string(),
          line_number: z.number(),
          match: z.string()
        }))
      }
    },
    async ({ projectId, path, query, regex, case_sensitive, max_results }) => {
      try {
        const project = await getProject(projectId);
        const result = await searchInProject(project, { path, query, regex, case_sensitive, max_results });
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