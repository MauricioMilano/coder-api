# REST API Usage

## Overview

The Coder-API provides a comprehensive REST API for project and file management. This document covers the REST API endpoints and usage examples.

## API Documentation

See `openapi.json` for the full REST API contract, or visit `/openapi` endpoint when your server is running for interactive documentation.

## Base URL

When running locally:
```
http://localhost:3000
```

When deployed or using tunneling:
```
https://your-domain.com
https://your-tunnel-url.ngrok-free.app
```

## Example Requests

### Project Management

#### Add a project
```sh
curl -X POST http://localhost:3000/projects \
  -H 'Content-Type: application/json' \
  -d '{"source":{"local":{"mount":"workbench","path":"/my-project"}},"name":"my-project"}'
```

#### List projects
```sh
curl http://localhost:3000/projects
```

#### Get project details
```sh
curl http://localhost:3000/projects/prj_xxx
```

#### Rename project
```sh

### SSH (if enabled)

#### Generate key
```sh
curl -X POST http://localhost:3000/projects/prj_xxx/ssh/keygen \
  -H 'Content-Type: application/json' \
  -d '{"type":"ed25519","comment":"coder-api"}'
```

#### Read public key
```sh
curl 'http://localhost:3000/projects/prj_xxx/ssh/public-key?type=ed25519'
```
curl -X PATCH http://localhost:3000/projects/prj_xxx \
  -H 'Content-Type: application/json' \
  -d '{"name":"new-project-name"}'
```

### File Operations

#### Read filetree
```sh
curl 'http://localhost:3000/projects/prj_xxx/filetree?path=/&depth=2'
```

#### Read a file
```sh
curl 'http://localhost:3000/projects/prj_xxx/files?path=/README.md'
```

#### Create a file
```sh
curl -X POST http://localhost:3000/projects/prj_xxx/files \
  -H 'Content-Type: application/json' \
  -d '{"path":"/src/index.ts","content":"export {}","encoding":"text","create_parents":true,"overwrite":false}'
```

#### Delete a file
```sh
curl -X DELETE 'http://localhost:3000/projects/prj_xxx/files?path=/old-file.txt'
```

#### Patch a file
```sh
curl -X PATCH http://localhost:3000/projects/prj_xxx/files \
  -H 'Content-Type: application/json' \
  -d '{
    "path": "/src/main.ts",
    "patch": {
      "type": "replace",
      "content": "console.log(\"Hello, World!\");"
    }
  }'
```

### System Operations

#### Run bash command
```sh
curl -X POST http://localhost:3000/projects/prj_xxx/bash \
  -H 'Content-Type: application/json' \
  -d '{"command":"ls -la","workdir":"/","timeout_sec":10}'
```

#### Run with environment variables
```sh
curl -X POST http://localhost:3000/projects/prj_xxx/bash \
  -H 'Content-Type: application/json' \
  -d '{"command":"npm install","workdir":"/","timeout_sec":300,"env":{"NODE_ENV":"development"}}'
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error context
    }
  }
}
```

## Authentication

Currently, the API does not require authentication in development mode. For production deployments, consider implementing:
- API keys
- JWT tokens
- IP whitelisting
- Rate limiting

## Rate Limiting

Default rate limits:
- 100 requests per minute per IP
- 10 concurrent bash commands per project
- File size limit: 5MB (configurable via `MAX_FILE_SIZE`)

## Error Codes

Common error codes:
- `PROJECT_NOT_FOUND` - Project ID does not exist
- `FILE_NOT_FOUND` - Requested file does not exist
- `PERMISSION_DENIED` - Operation not allowed
- `FILE_TOO_LARGE` - File exceeds size limit
- `TIMEOUT` - Operation timed out
- `INVALID_PATH` - File path is invalid or outside workspace

## Best Practices

1. **Always check project existence** before file operations
2. **Use appropriate timeouts** for bash commands
3. **Handle file encoding properly** (text vs base64)
4. **Create parent directories** when needed using `create_parents` flag
5. **Use proper error handling** for all API responses
6. **Implement retries** for network-related failures
7. **Validate file paths** to prevent directory traversal

## Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: { git: { url: 'https://github.com/user/repo' } },
    name: 'my-project'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Project created:', result.data.projectId);
}
```

### Python
```python
import requests

response = requests.post('http://localhost:3000/projects', json={
    'source': {'git': {'url': 'https://github.com/user/repo'}},
    'name': 'my-project'
})

if response.json()['success']:
    project_id = response.json()['data']['projectId']
    print(f'Project created: {project_id}')
```

### cURL with JWT (if authentication is implemented)
```sh
curl -X POST http://localhost:3000/projects \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"source":{"git":{"url":"https://github.com/user/repo"}},"name":"my-project"}'
```