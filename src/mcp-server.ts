import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllMcpTools } from './mcp';

// Create the MCP server
const mcpServer = new McpServer({
  name: 'coder-api-mcp',
  version: '1.0.0'
});

// Register all tools from the modular structure
registerAllMcpTools(mcpServer);

// Export the server for use in other modules
export { mcpServer };