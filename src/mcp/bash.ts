import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getProject } from '../core/projects';
import { runBashCommand } from '../core/bash';

export function registerBashTools(mcpServer: McpServer) {
  // Run Bash Command
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
      console.log(`[MCP bash] Tool called with projectId: ${projectId}, command: ${command}`);
      try {
        const result = await runBashCommand(projectId, { command, workdir, timeout_sec, env });
        const { stdout, stderr, exit_code, duration_ms, truncated } = result;
        console.log(`[MCP bash] Command completed successfully, exit_code: ${exit_code}`);
        return {
          content: [{ type: 'text', text: JSON.stringify({ stdout, stderr, exit_code, duration_ms, truncated }) }],
          structuredContent: { stdout, stderr, exit_code, duration_ms, truncated }
        };
      } catch (error: any) {
        console.error(`[MCP bash] Tool execution failed:`, error);
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );
}