# Running Locally

Guide for running Coder-API locally for development and testing.

## Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io/) (recommended) or npm
- Git

## Quick Start

1. **Clone the repository:**
   ```sh
   git clone https://github.com/MauricioMilano/coder-api.git
   cd coder-api
   ```

2. **Install dependencies:**
   ```sh
   pnpm install
   ```

3. **Configure environment variables:**
   Create a `.env` file and configure your settings:
   ```env
   PORT=3000
   WORKSPACE_ROOT=/srv/workspace
   ALLOW_NETWORK=false
   MAX_FILE_SIZE=5000000
   MAX_STDOUT_BYTES=2000000
   BASH_TIMEOUT_SEC=120
   MAX_UPLOAD_MB=20
   ```

   **Important:** The `WORKSPACE_ROOT` folder must start empty and will contain all your projects.

4. **Run in development mode:**
   ```sh
   pnpm dev
   ```

5. **Build and run in production mode:**
   ```sh
   pnpm build
   pnpm start
   ```

## Development Features

- **Hot reload**: Changes are automatically reloaded in development mode
- **TypeScript support**: Full TypeScript compilation and type checking
- **Debug mode**: Enhanced logging and error reporting

## Testing the API

Once running, you can test the API:

- **REST API Documentation**: http://localhost:3000/openapi
- **Health Check**: http://localhost:3000/health
- **MCP Endpoint**: http://localhost:3000/mcp
- **Capabilities**: http://localhost:3000/capabilities

## Local Testing with External Services

To test with external services like ChatGPT:

1. **Use local tunneling** (see [Local Tunneling Guide](./local-tunneling.md))
2. **Or deploy to a development server** (see other deployment guides)

## Docker Development

Alternative local setup using Docker:

1. **Build the image:**
   ```sh
   docker build -t coder-api-dev .
   ```

2. **Run with development settings:**
   ```sh
   docker run -d \
     --name coder-api-dev \
     -p 3000:3000 \
     -v $(pwd):/app \
     -v /path/to/local/workspace:/srv/workspace \
     -e WORKSPACE_ROOT=/srv/workspace \
     -e NODE_ENV=development \
     coder-api-dev
   ```

## Troubleshooting

### Common Issues

- **Port already in use**: Change the `PORT` in your `.env` file
- **Permission denied**: Ensure the `WORKSPACE_ROOT` directory is writable
- **Module not found**: Run `pnpm install` to ensure all dependencies are installed

### Logs

Check application logs for debugging:
```sh
# Development mode shows detailed logs
pnpm dev

# Or check Docker logs
docker logs coder-api-dev
```