# Model Context Protocol (MCP) Overview

## What is MCP?

The Model Context Protocol (MCP) is a standardized protocol for connecting AI assistants with external tools and data sources. Coder-API implements MCP to provide seamless integration with AI models and development tools.

## MCP vs REST API

| Feature | MCP | REST API |
|---------|-----|----------|
| **Integration** | Native AI assistant support | Manual HTTP requests |
| **Tool Discovery** | Automatic | Manual API exploration |
| **Type Safety** | Built-in with Zod schemas | OpenAPI documentation |
| **Real-time** | SSE transport available | Standard HTTP |
| **Use Case** | AI-driven development | Traditional web clients |
| **Streaming** | Native progress reporting | Not available |
| **Error Handling** | Standardized MCP errors with context | Basic HTTP status codes |

## MCP Endpoints

Coder-API exposes MCP through multiple transport methods:

### HTTP Transport
- **Endpoint**: `/mcp`
- **Method**: POST
- **Content-Type**: `application/json`

### Server-Sent Events (SSE) Transport
- **Endpoint**: `/mcp-sse` 
- **Method**: GET
- **Accept**: `text/event-stream`

## Available MCP Tools

### Project Management
- `create-project` - Create new projects from Git repositories, archives, or empty directories
- `list-projects` - Get a list of all projects
- `get-project-details` - Get detailed information about a specific project
- `rename-project` - Rename existing projects

### File Operations
- `get-file` - Read file contents with support for text and base64 encoding
- `create-file` - Create new files with overwrite protection
- `delete-file` - Delete files or directories with recursive options
- `patch-file` - Apply modifications using various patch operations

### System Operations
- `run-bash` - Execute bash commands in project directories with timeout and environment controls
- `list-filetree` - Browse project file structures with configurable depth and entry limits

## MCP Tool Usage Examples

### Tool Discovery
```json
{
  "method": "tools/list",
  "params": {}
}
```

### Create Project
```json
{
  "method": "tools/call",
  "params": {
    "name": "create-project",
    "arguments": {
      "source": {
        "git": {
          "url": "https://github.com/user/repo"
        }
      },
      "name": "my-project"
    }
  }
}
```

### List Projects
```
### SSH Tools (if enabled)

#### Generate key
```json
{
  "method": "tools/call",
  "params": {
    "name": "ssh-keygen",
    "arguments": {
      "projectId": "prj_xxx",
      "type": "ed25519",
      "comment": "coder-api"
    }
  }
}
```

#### Read public key
```json
{
  "method": "tools/call",
  "params": {
    "name": "ssh-public-key",
    "arguments": {
      "projectId": "prj_xxx",
      "type": "ed25519"
    }
  }
}
```
json
{
  "method": "tools/call",
  "params": {
    "name": "list-projects",
    "arguments": {}
  }
}
```

### Read File
```json
{
  "method": "tools/call",
  "params": {
    "name": "get-file",
    "arguments": {
      "projectId": "prj_abc123",
      "path": "/src/main.ts"
    }
  }
}
```

### Execute Command
```json
{
  "method": "tools/call",
  "params": {
    "name": "run-bash",
    "arguments": {
      "projectId": "prj_abc123",
      "command": "npm install",
      "workdir": "/",
      "timeout_sec": 300
    }
  }
}
```

## MCP Response Format

### Success Response
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Operation completed successfully"
      }
    ]
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Project name cannot be empty",
    "data": {
      "field": "name",
      "value": "",
      "constraint": "minimum length 1"
    }
  }
}
```

### Progress Updates (SSE)
```json
{
  "type": "progress",
  "operation": "project-creation",
  "stage": "cloning-repository",
  "percent": 75,
  "message": "Downloading files..."
}
```

## Schema Validation

All MCP tools use Zod schemas for automatic validation:

```typescript
const createProjectSchema = z.object({
  source: z.union([
    z.object({ 
      git: z.object({ 
        url: z.string().url() 
      }) 
    }),
    z.object({ 
      local: z.object({ 
        path: z.string() 
      }) 
    })
  ]),
  name: z.string().min(1)
});
```

## Integration Guides

For specific AI assistant integrations, see:
- **[ChatGPT MCP Integration](../how-to-use/on_chatgpt_mcp.md)** - Native MCP support in ChatGPT
- **[VS Code Copilot Integration](../how-to-use/on_copilot.md)** - Using MCP with VS Code
- **[ChatGPT REST Integration](../how-to-use/on_chatgpt_rest.md)** - Legacy REST API approach

## Testing MCP

### Test Connection
```sh
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### Test Tool Execution
```sh
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "list-projects",
      "arguments": {}
    }
  }'
```

### Test SSE Transport
```sh
curl -N http://localhost:3000/mcp-sse
```

## MCP Client Libraries

Popular MCP client libraries:
- **@modelcontextprotocol/sdk** - Official TypeScript/JavaScript SDK
- **mcp-python** - Python MCP client
- **mcp-go** - Go MCP client

## Configuration

MCP-specific environment variables:
```env
# MCP Transport Options
MCP_TRANSPORT=http,sse
MCP_MAX_CONNECTIONS=10
MCP_HEARTBEAT_INTERVAL=30

# Enhanced capabilities for MCP
MAX_FILE_SIZE=20000000
MAX_STDOUT_BYTES=10000000
BASH_TIMEOUT_SEC=600

# Real-time features
ENABLE_PROGRESS_REPORTING=true
ENABLE_STREAMING_RESPONSES=true
```