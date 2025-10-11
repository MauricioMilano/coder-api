import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProjectTools } from './projects';
import { registerFileTools } from './files';
import { registerBashTools } from './bash';
import { registerFiletreeTools } from './filetree';
import { registerSearchTools } from './search';
import { registerPM2Tools } from './pm2';

export function registerAllMcpTools(mcpServer: McpServer) {
  // Core domain tools (matching routes structure)
  registerProjectTools(mcpServer);
  registerFileTools(mcpServer); // Now includes all patch operations
  registerBashTools(mcpServer);
  registerFiletreeTools(mcpServer);
  registerSearchTools(mcpServer);
  registerPM2Tools(mcpServer);
}