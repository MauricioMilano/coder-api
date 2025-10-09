# Cloud Platform Deployment

Deploy Coder-API on various cloud platforms.

## Render

Deploy using Render's standard Node.js deployment process:

1. Connect your GitHub repository to Render
2. Configure build command: `pnpm install && pnpm build`
3. Configure start command: `pnpm start`
4. Set environment variables in the Render dashboard
5. Deploy and get your public URL

## Heroku

Deploy using Heroku's standard Node.js deployment process:

1. Install Heroku CLI
2. Login and create app:
   ```sh
   heroku login
   heroku create your-app-name
   ```

3. Set environment variables:
   ```sh
   heroku config:set WORKSPACE_ROOT=/srv/workspace
   heroku config:set PORT=3000
   # Add other environment variables as needed
   ```

4. Deploy:
   ```sh
   git push heroku main
   ```

## Easypanel

Deploy using Easypanel's Docker-based deployment:

1. **Connect your repository** to Easypanel
2. **Configure the service:**
   - **Name**: `coder-api`
   - **Source**: MauricioMilano/coder-api
   - **Build**: Dockerfile (uses the existing Dockerfile in the repo)
    - **Build path**: `/`
3. **Set environment variables:**
   ```
   WORKSPACE_ROOT=/srv/workspace
   PORT=3000
   MAX_FILE_SIZE=5000000
   MAX_STDOUT_BYTES=2000000
   BASH_TIMEOUT_SEC=120
   MAX_UPLOAD_MB=20
   ```

4. **Configure volumes** (optional):
   - Mount a persistent volume to `/srv/workspace` for data persistence

5. **Deploy** and get your public URL

## Other Cloud Platforms

Similar deployment processes apply to:
- **Railway**: Connect repo, configure build/start commands
- **Vercel**: May require serverless adaptations
- **Digital Ocean App Platform**: Standard Node.js deployment
- **AWS/GCP/Azure**: Use their respective Node.js hosting services
- **Coolify**: Self-hosted alternative with Docker support

## Environment Configuration

For all cloud deployments, ensure these environment variables are set:
- `WORKSPACE_ROOT`: Path for project storage
- `PORT`: Application port (usually provided by platform)
- `MAX_FILE_SIZE`: File size limits
- `BASH_TIMEOUT_SEC`: Command timeout settings
- Other configuration as needed