# Coder-API

A backend for an autonomous agent to be used through the ChatGPT UI. 


![architecture](./docs/pictures/core/architecture.png)


## How it works
- Coder-API runs on your computer and lets you access your files, folders, terminal.
- A tunnel connects your local API to the internet using Ngrok.
- Ngrok creates a link so that external services (like GPT) can reach your Coder-API.
- GPT (or other AI tools) can now interact with your computer’s resources by sending requests through this tunnel.


## Features


The server provides the following capabilities:

#### Project Management
- `create-project` - Create new projects from Git repositories, archives, or empty directories
- `rename-project` - Rename existing projects
- `list-projects` - Get a list of all projects
- `get-project-details` - Get detailed information about a specific project

#### File Operations
- `get-file` - Read file contents with support for text and base64 encoding
- `create-file` - Create new files with overwrite protection
- `delete-file` - Delete files or directories with recursive options
- `patch-file` - Apply modifications using various patch operations (diff, replace, lines, insert, code_block)

#### System Operations
- `run-bash` - Execute bash commands in project directories with timeout and environment controls
- `list-filetree` - Browse project file structures with configurable depth and entry limits

## How we build it 

- Express server with dual protocol support:
  - **REST API** for traditional HTTP-based project and file management
  - **MCP (Model Context Protocol)** for seamless LLM integration
- OpenAPI contract (`openapi.json`)
- Multiple transport options for MCP (HTTP and Server-Sent Events)
- 
## Getting Started 

For detailed local setup instructions, see **[Running Locally](./docs/deploy/running-locally.md)**.

**Quick start:**
- Node.js >= 20
- [pnpm](https://pnpm.io/) (recommended)
- Clone, install dependencies, configure `.env`, and run `pnpm dev`

## Deployment

For detailed setup and deployment instructions, see our deployment guides:

- **[Running Locally](./docs/deploy/running-locally.md)** - Local development setup and testing
- **[Self-Hosted Server](./docs/deploy/self-hosted.md)** - Deploy on your own VPS or server
- **[Cloud Platforms](./docs/deploy/cloud-platforms.md)** - Deploy on Render, Heroku, Easypanel, and other cloud services  
- **[Local Tunneling](./docs/deploy/local-tunneling.md)** - Use ngrok or other tunneling services for development

To allow external services (like ChatGPT or other AI assistants) to access your Coder-API, you need to make it accessible over the internet using one of the deployment methods above.

---

## API Documentation

Coder-API provides two main interfaces:

### REST API
Traditional HTTP-based API for project and file management.
- **[REST API Documentation](./docs/api/rest-api.md)** - Complete REST API guide with examples
- **OpenAPI Contract**: `/openapi` endpoint or `openapi.json` file

### Model Context Protocol (MCP) 
Standardized protocol for AI assistant integration.
- **[MCP Overview](./docs/api/mcp.md)** - MCP protocol documentation and examples

## How To Use  
- **[ChatGPT MCP Integration](./docs/how-to-use/on_chatgpt_mcp.md)** - Using MCP with ChatGPT
- **[ChatGPT REST Integration](./docs/how-to-use/on_chatgpt_rest.md)** - Using REST API with ChatGPT
- **[VS Code Copilot Integration](./docs/how-to-use/on_copilot.md)** - Using with VS Code

## Security Notes

- All file operations are confined to `WORKSPACE_ROOT/{projectId}`.
- Bash commands are not fully network-isolated (MVP). Use in a controlled environment.
- See deployment documentation for security considerations specific to each deployment method.

## Contributing

1. Fork and clone the repo.
2. Create a feature branch.
3. Add tests for new features (see `tests/` if available).
4. Run `pnpm lint` before submitting a PR.
5. Open a pull request with a clear description.
