# Local Tunneling with Ngrok

For development and testing, you can quickly expose your local server using [ngrok](https://ngrok.com/).

## Setup

1. **Configure ngrok:**
   ```sh
   # Create a free ngrok account at https://dashboard.ngrok.com
   # Get your authtoken and configure it
   npx ngrok config add-authtoken $YOUR_AUTHTOKEN
   ```

2. **Start the server with tunnel:**
   ```sh
   pnpm tunnel
   ```

3. **You'll get output like:**
   ```
   {"level":30,"time":1757608557875,"pid":7446,"hostname":"Mauricio-Pc","msg":"Server listening at http://0.0.0.0:3007"}
   Server listening locally on port 3007
   ChatGPT URL: https://my123url.ngrok-free.app/openapi
   ```

4. **Use the ngrok URL for:**
   - ChatGPT Actions: `https://your-url.ngrok-free.app/openapi`
   - MCP clients: `https://your-url.ngrok-free.app/mcp`

## Other Tunneling Services

### Cloudflare Tunnel
Free, no account limits:
```sh
npx cloudflared tunnel --url http://localhost:3000
```

### LocalTunnel
Simple, no signup required:
```sh
npx localtunnel --port 3000
```

## Security Notes

**Tunneling services:** Be aware that your local environment becomes accessible over the internet when using tunneling services. Use appropriate security measures and only expose what's necessary.