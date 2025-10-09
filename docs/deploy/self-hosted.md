# Self-Hosted Server Deployment

Deploy Coder-API on your own server with a public IP address or domain.

## Using Docker

1. **Build the Docker image:**
   ```sh
   docker build -t coder-api .
   ```

2. **Run with Docker:**
   ```sh
   docker run -d \
     --name coder-api \
     -p 3000:3000 \
     -v /path/to/workspace:/srv/workspace \
     -e WORKSPACE_ROOT=/srv/workspace \
     coder-api
   ```

## Direct Deployment

1. **On a VPS/Cloud Server:**
   ```sh
   # Clone and setup
   git clone https://github.com/MauricioMilano/coder-api.git
   cd coder-api
   pnpm install
   pnpm build
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your settings
   
   # Start with PM2 (recommended)
   npm install -g pm2
   pm2 start npm --name "coder-api" -- start
   pm2 startup
   pm2 save
   ```

2. **Configure reverse proxy (nginx example):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Access your API:**
   - REST API: `https://your-domain.com/openapi`
   - MCP HTTP: `https://your-domain.com/mcp`
   - MCP SSE: `https://your-domain.com/mcp-sse`

## Security Considerations

- **Production deployments:** Use HTTPS, configure firewalls, and implement authentication if needed.
- **Self-hosted servers:** Ensure proper access controls and monitoring.
- All file operations are confined to `WORKSPACE_ROOT/{projectId}`.
- Bash commands are not fully network-isolated (MVP). Use in a controlled environment.