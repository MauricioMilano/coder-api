# Using Coder-API with ChatGPT (REST API)

## Overview

This guide explains how to set up Coder-API with ChatGPT using the REST API through custom GPT actions. This is the traditional approach using HTTP requests.

## Prerequisites

- ChatGPT Plus or Team subscription (required for custom GPTs)
- Coder-API server running locally or deployed
- Internet access to your Coder-API instance (via tunnel or public deployment)

## Setup Instructions

### 1. Start Your Coder-API Server

First, ensure your Coder-API server is running:

```sh
# For local development with tunnel
pnpm tunnel

# Or for local development only
pnpm dev
```

If using `pnpm tunnel`, you'll get an output like:
```
Server listening locally on port 3007
ChatGPT URL: https://my123url.ngrok-free.app/openapi
```

### 2. Create a Custom GPT

1. Go to [ChatGPT GPTs](https://chatgpt.com/gpts)
2. Click **"Create a GPT"** or **"My GPTs"** → **"Create a GPT"**

![My GPTs](../../docs/pictures/mygpts.png)

3. Fill in your GPT details:
   - **Name**: "Coder Assistant (REST API)"
   - **Description**: "An autonomous coding assistant using REST API to access local development environment"
   - **Instructions**: Add instructions for REST API usage

![New GPT](../../docs/pictures/new_gpt.png)

### 3. Configure REST API Actions

1. In the GPT configuration, go to the **"Actions"** section
2. Click **"Create new action"**
3. Choose **"Import from URL"**

![Import URL](../../docs/pictures/import_url.png)

4. Enter your Coder-API OpenAPI URL:
   ```
   https://your-tunnel-url.ngrok-free.app/openapi
   ```
   **Important**: Don't forget the `/openapi` path!

5. Click **"Import"** to load the REST API schema

### 4. Verify REST Actions Import

After importing, you should see all available REST API actions:

![After Import](../../docs/pictures/coder_imported.png)

The imported REST actions include:
- `create-project` - Create new projects from Git repos or local paths
- `list-projects` - List all available projects
- `get-project-details` - Get detailed project information
- `rename-project` - Rename existing projects
- `get-file` - Read file contents with encoding support
- `create-file` - Create new files with parent directory creation
- `delete-file` - Delete files or directories
- `patch-file` - Apply various patch operations (diff, replace, lines, insert)
- `run-bash` - Execute bash commands with timeout controls
- `list-filetree` - Browse project file structures

### 5. Save and Test

1. Click **"Save"** to save your custom GPT
2. Test the REST API connection by asking: "List my current projects"
3. If successful, the GPT will make HTTP requests to your Coder-API

## REST API Usage Examples

Once configured, you can interact with your development environment:

### Project Management
- **"Create a new project from GitHub repo https://github.com/user/my-repo"**
- **"List all my current projects with their details"**
- **"Rename project prj_123 to 'my-new-name'"**

### File Operations
- **"Show me the contents of package.json in project prj_123"**
- **"Create a new file at src/components/Button.tsx with a React component"**
- **"Delete the old config file in project prj_123"**
- **"Apply this diff patch to src/main.ts"**

### Development Tasks
- **"Run 'npm install' in project prj_123"**
- **"Execute the build command and show me the output"**
- **"Browse the file structure of my React project"**

## REST API Advantages

- **Standard HTTP**: Uses familiar REST endpoints
- **OpenAPI Documentation**: Full API schema available
- **Flexible Operations**: Support for various file operations and patch types
- **Direct Integration**: Works with any HTTP client
- **Detailed Control**: Fine-grained control over requests and responses

## Custom Instructions for REST API

Add these instructions to your GPT for better REST API usage:

```
You are a software development assistant using REST API calls to interact with a local Coder-API server.

Guidelines:
1. Always use project IDs (prj_xxx) when working with specific projects
2. Check project existence with list-projects before file operations
3. Use appropriate patch operations (diff, replace, lines) based on the task
4. Handle file encoding properly (text vs base64)
5. Create parent directories when needed using create_parents flag
6. Set appropriate timeouts for bash commands
7. Use proper error handling for HTTP responses

For file modifications:
- Use 'diff' patch for small changes
- Use 'replace' patch for complete rewrites
- Use 'lines' patch for line-specific edits
- Use 'insert' patch for adding content at specific positions
```

## Security Considerations

- REST API endpoints are publicly accessible through your tunnel
- Use HTTPS in production deployments
- Monitor API usage and rate limits
- Consider implementing authentication for production use
- Be cautious with bash command execution permissions

## Troubleshooting REST API

### Common Issues

1. **"HTTP 404 errors"**
   - Verify the OpenAPI endpoint is accessible
   - Check that project IDs are correct (prj_xxx format)
   - Ensure file paths are properly formatted

2. **"Timeout errors"**
   - Increase BASH_TIMEOUT_SEC for long-running commands
   - Check network connectivity to your tunnel
   - Verify server is responding to health checks

3. **"File operation errors"**
   - Check WORKSPACE_ROOT permissions
   - Verify file paths are within project boundaries
   - Ensure proper encoding (text/base64) is used

### Testing REST API Manually

```sh
# Test OpenAPI schema
curl https://your-tunnel-url.ngrok-free.app/openapi

# List projects
curl https://your-tunnel-url.ngrok-free.app/projects

# Get file contents
curl "https://your-tunnel-url.ngrok-free.app/projects/prj_123/files?path=/README.md"

# Create a file
curl -X POST https://your-tunnel-url.ngrok-free.app/projects/prj_123/files \
  -H "Content-Type: application/json" \
  -d '{"path":"/test.txt","content":"Hello World","encoding":"text"}'
```

## Environment Configuration

Optimize your Coder-API for REST API usage:

```env
# REST API specific settings
PORT=3000
MAX_FILE_SIZE=10000000
MAX_STDOUT_BYTES=5000000
BASH_TIMEOUT_SEC=300
MAX_UPLOAD_MB=50

# Enable network for package installations
ALLOW_NETWORK=true

# Workspace configuration
WORKSPACE_ROOT=/srv/workspace
```

## Next Steps

With REST API integration, your ChatGPT can:
- Perform complex file operations with precise control
- Handle large codebases with efficient patch operations
- Execute development workflows with proper error handling
- Integrate with existing HTTP-based tools and services
- Provide detailed logging and debugging information