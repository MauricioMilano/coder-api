# Coder-API

A minimal backend for an autonomous project modification agent to be consumed by chatGPT using OpenAPI specs. 

## Features

- Fastify server with REST API for project and file management
- TypeScript, Zod validation, Pino logging
- File operations, bash execution, and project isolation
- OpenAPI contract (`openapi.json`)

## Requirements

- Node.js >= 20
- [pnpm](https://pnpm.io/) (recommended)
- Docker (optional)

## Setup

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
   Create a `.env` file (example):
   ```
   PORT=3000
   WORKSPACE_ROOT=/srv/workspace
   ALLOW_NETWORK=false
   MAX_FILE_SIZE=5000000
   MAX_STDOUT_BYTES=2000000
   BASH_TIMEOUT_SEC=120
   MAX_UPLOAD_MB=20
   ```

4. **Run in development:**
   ```sh
   pnpm dev
   ```

5. **Build and run in production:**
   ```sh
   pnpm build
   pnpm start
   ```


## Exposing the API to ChatGPT

To allow ChatGPT (or any external service) to access your local backend, you must expose your server to the public internet using a tunneling service. This is required because ChatGPT cannot access localhost or private IPs directly.


### Exposing with LocalTunnel (Recommended for Quick Testing)

This project includes a script to expose your local server using [localtunnel](https://github.com/localtunnel/localtunnel).

**To start the server and get a public URL:**

```sh
pnpm tunnel
```

You will see output like:

```
Server listening locally on port 3000
LocalTunnel URL: https://your-subdomain.loca.lt
```

Use the LocalTunnel URL in ChatGPT or any external client.

---

You can also use other tunneling services, such as:

- [ngrok](https://ngrok.com/)
- [loca.lt](https://docs.localtunnel.me/)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

**Example with ngrok:**

```sh
ngrok http 3000
```

Replace `3000` with the port your backend is running on. Use the generated public URL in ChatGPT or any external client.


## API Usage

See `openapi.json` for the full contract.

### Example requests

- **Add a project:**
  ```sh
  curl -X POST http://localhost:3000/projects \
    -H 'Content-Type: application/json' \
    -d '{"source":{"local":{"mount":"workbench","path":"/my-project"}},"name":"my-project"}'
  ```

- **Read filetree:**
  ```sh
  curl 'http://localhost:3000/projects/prj_xxx/filetree?path=/&depth=2'
  ```

- **Read a file:**
  ```sh
  curl 'http://localhost:3000/projects/prj_xxx/files?path=/README.md'
  ```

- **Create a file:**
  ```sh
  curl -X POST http://localhost:3000/projects/prj_xxx/files \
    -H 'Content-Type: application/json' \
    -d '{"path":"/src/index.ts","content":"export {}","encoding":"text","create_parents":true,"overwrite":false}'
  ```

- **Run bash command:**
  ```sh
  curl -X POST http://localhost:3000/projects/prj_xxx/bash \
    -H 'Content-Type: application/json' \
    -d '{"command":"ls -la","workdir":"/","timeout_sec":10}'
  ```

## Security Notes

- All file operations are confined to `WORKSPACE_ROOT/{projectId}`.
- Bash commands are not fully network-isolated (MVP). Use in a controlled environment.

## Contributing

1. Fork and clone the repo.
2. Create a feature branch.
3. Add tests for new features (see `tests/` if available).
4. Run `pnpm lint` before submitting a PR.
5. Open a pull request with a clear description.
