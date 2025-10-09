# Using Coder-API with VS Code Copilot

## Setup Instructions

### With VS Code Copilot or MCP-compatible clients:

1. Start the server:
   ```sh
   pnpm dev
   ```

2. Connect your MCP client to:
   - HTTP Transport: `http://localhost:3000/mcp`
   - SSE Transport: `http://localhost:3000/mcp-sse`

3. If using with external services, expose via tunnel:
   ```sh
   pnpm tunnel
   ```

## Example Usage

Once connected, AI assistants can:

- **Create a new project**: "Create a project from the GitHub repo https://github.com/user/repo"
- **Read files**: "Show me the contents of src/main.ts in project prj_123"
- **Modify files**: "Add a new function to utils.js that formats dates"
- **Run commands**: "Run npm install in the project directory"
- **Browse structure**: "Show me the file tree of the project"