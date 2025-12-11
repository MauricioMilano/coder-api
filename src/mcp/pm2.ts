import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { 
  startPM2App,
  stopPM2App,
  restartPM2App,
  deletePM2App,
  listPM2Apps,
  getPM2AppStatus,
  getPM2AppLogs,
  stopAllPM2Apps,
  checkPM2Installation,
  PM2StartOptions
} from '../core/pm2';

export function registerPM2Tools(mcpServer: McpServer) {
  // PM2 Health Check
  mcpServer.registerTool(
    'pm2-health',
    {
      title: 'Check PM2 Installation',
      description: 'Check if PM2 is properly installed and available for use',
      inputSchema: {},
      outputSchema: {
        installed: z.boolean(),
        error: z.string().optional()
      }
    },
    async () => {
      try {
        const result = await checkPM2Installation();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as { [key: string]: unknown }
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Start PM2 Application
  mcpServer.registerTool(
    'pm2-start',
    {
      title: 'Start PM2 Application',
      description: 'Start an application using PM2 process manager with advanced configuration options',
      inputSchema: {
        // projectId removed: PM2 operations are global
        name: z.string().describe('Application name for PM2'),
        script: z.string().describe('Path to the script to run (relative to project root)'),
        cwd: z.string().optional().describe('Working directory (relative to project root)'),
        args: z.array(z.string()).optional().describe('Arguments to pass to the script'),
        env: z.record(z.string()).optional().describe('Environment variables'),
        instances: z.number().optional().describe('Number of instances to run (for clustering)'),
        watch: z.boolean().default(false).describe('Enable file watching for auto-restart'),
        ignore_watch: z.array(z.string()).optional().describe('Files/folders to ignore when watching'),
        max_memory_restart: z.string().optional().describe('Restart when memory usage exceeds limit (e.g., "1G")'),
        log_file: z.string().optional().describe('Combined logs file path'),
        out_file: z.string().optional().describe('Stdout logs file path'),
        error_file: z.string().optional().describe('Stderr logs file path'),
        merge_logs: z.boolean().default(false).describe('Merge logs from all instances'),
        time: z.boolean().default(false).describe('Prefix logs with timestamp')
      },
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional()
      }
    },
    async ({  name, script, cwd, args, env, instances, watch, ignore_watch, max_memory_restart, log_file, out_file, error_file, merge_logs, time }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const options: PM2StartOptions = {
          name,
          script,
          cwd,
          args,
          env,
          instances,
          watch,
          ignore_watch,
          max_memory_restart,
          log_file,
          out_file,
          error_file,
          merge_logs,
          time
        };
        
        const result = await startPM2App(options);
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

  // Stop PM2 Application
  mcpServer.registerTool(
    'pm2-stop',
    {
      title: 'Stop PM2 Application',
      description: 'Stop a running PM2 application by name or ID',
      inputSchema: {
        // projectId removed: PM2 operations are global
        nameOrId: z.string().describe('Application name or PM2 process ID')
      },
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional()
      }
    },
    async ({  nameOrId }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const result = await stopPM2App(nameOrId);
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

  // Restart PM2 Application
  mcpServer.registerTool(
    'pm2-restart',
    {
      title: 'Restart PM2 Application',
      description: 'Restart a PM2 application by name or ID',
      inputSchema: {
        // projectId removed: PM2 operations are global
        nameOrId: z.string().describe('Application name or PM2 process ID')
      },
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional()
      }
    },
    async ({  nameOrId }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const result = await restartPM2App(nameOrId);
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

  // Delete PM2 Application
  mcpServer.registerTool(
    'pm2-delete',
    {
      title: 'Delete PM2 Application',
      description: 'Delete a PM2 application by name or ID (stops and removes from PM2)',
      inputSchema: {
        // projectId removed: PM2 operations are global
        nameOrId: z.string().describe('Application name or PM2 process ID')
      },
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional()
      }
    },
    async ({  nameOrId }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const result = await deletePM2App(nameOrId);
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

  // List PM2 Applications
  mcpServer.registerTool(
    'pm2-list',
    {
      title: 'List PM2 Applications',
      description: 'List all PM2 applications with their status and information',
      inputSchema: {},
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional(),
        processes: z.array(z.object({
          pid: z.number().nullable(),
          name: z.string(),
          pm2_env: z.object({
            status: z.string(),
            pm_id: z.number(),
            restart_time: z.number(),
            unstable_restarts: z.number(),
            created_at: z.number()
          }),
          monit: z.object({
            memory: z.number(),
            cpu: z.number()
          })
        })).optional()
      }
    },
    async ({ projectId }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const result = await listPM2Apps();
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

  // Get PM2 Application Status
  mcpServer.registerTool(
    'pm2-status',
    {
      title: 'Get PM2 Application Status',
      description: 'Get detailed status information for a specific PM2 application',
      inputSchema: {
        // projectId removed: PM2 operations are global
        nameOrId: z.string().describe('Application name or PM2 process ID')
      },
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional()
      }
    },
    async ({  nameOrId }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const result = await getPM2AppStatus(nameOrId);
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

  // Get PM2 Application Logs
  mcpServer.registerTool(
    'pm2-logs',
    {
      title: 'Get PM2 Application Logs',
      description: 'Get recent logs from a PM2 application',
      inputSchema: {
        // projectId removed: PM2 operations are global
        nameOrId: z.string().describe('Application name or PM2 process ID'),
        lines: z.number().default(100).describe('Number of recent log lines to retrieve')
      },
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional()
      }
    },
    async ({  nameOrId, lines }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const result = await getPM2AppLogs(nameOrId, lines);
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

  // Stop All PM2 Applications
  mcpServer.registerTool(
    'pm2-kill-all',
    {
      title: 'Stop All PM2 Applications',
      description: 'Stop and kill all PM2 applications (PM2 daemon shutdown)',
      inputSchema: {},
      outputSchema: {
        success: z.boolean(),
        output: z.string(),
        error: z.string().optional()
      }
    },
    async ({ projectId }) => {
      try {
        // projectId is no longer required for PM2 operations (PM2 is global), omit fetching project
        const result = await stopAllPM2Apps();
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