# Copilot / AI Agent Instructions — Coder-API

Short, actionable guidance to help AI coding agents be productive in this repository.

## Quick start (local)
- Install deps: `pnpm install` (Node.js >= 20 required). 
- Dev server: `WORKSPACE_ROOT=/tmp/coder-workspace pnpm dev` — sets an isolated workspace root.
- Tunnel for external LLMs: `WORKSPACE_ROOT=/tmp/coder-workspace pnpm tunnel` (uses `start-with-tunnel.ts`).
- Build: `pnpm build` then `WORKSPACE_ROOT=/... pnpm start` to run compiled server.
- Lint: `pnpm lint`.

## High-level architecture (what to know)
- Two parallel interfaces: REST and MCP (Model Context Protocol).
  - REST entrypoint: `src/server.ts` — registers Express routes under `/projects` and `/mcp` endpoints.
  - MCP entrypoint: `src/mcp-server.ts` + `src/mcp/*.ts` — MCP tools are registered in `src/mcp/index.ts`.
- Core domain logic lives in `src/core/*` (projects, files, bash, pm2, filetree, search). Routes in `src/routes/*` call those core functions. This separation is intentional so both REST and MCP can reuse the same implementations.
- Persistent layout (runtime): projects are created under `WORKSPACE_ROOT/projects` and project metadata is stored in `WORKSPACE_ROOT/.state/*.json` (see `src/core/projects.ts`).

## Key files & patterns to inspect
- `src/server.ts` — main Express app, CORS, rate limiting, MCP transport wiring (`/mcp`, `/mcp-sse`, `/mcp-messages`).
- `src/mcp/index.ts` & `src/mcp/*.ts` — where MCP tools are registered; add new MCP tools here.
- `src/routes/*` — thin adapters that translate HTTP requests to `src/core/*` functions.
- `src/core/files.ts` — the canonical implementation of file operations and patch mechanics (supports `diff`, `replace`, `lines`, `insert`, `code_block`). Use it as the source of truth for patch API shapes and behavior (preview, `expected_hash` handling, stats).
- `src/core/projects.ts` — project lifecycle: create (git clone when allowed), rename, list, get. Respects `config.allowNetwork` (see `src/config.ts`).
- `src/lib/fs-safe.ts` — helpers that enforce safe path resolution inside `WORKSPACE_ROOT`.
- `openapi.json` and `/openapi` endpoint — used as the REST contract; update when adding or changing REST routes.

## Important run-time configuration & conventions
- Environment is validated by `src/config.ts` (zod). Required env vars: `WORKSPACE_ROOT`. `ALLOW_NETWORK` defaults to `'false'` — set to `'true'` (string) if you allow git clones and other network ops.
- File size / timeouts are controlled via env vars: `MAX_UPLOAD_MB`, `BASH_TIMEOUT_SEC`, `MAX_STDOUT_BYTES`.
- Idempotency: some endpoints accept an idem key; check `src/lib/idem.ts` and patterns in `src/core/projects.ts`.
- Errors are thrown as objects with `statusCode` (e.g. `{ statusCode: 404, message: '...' }`) and are normalized by `src/lib/problem-handler.ts`.

## How to add a new feature (recommended steps)
1. Implement the domain logic in `src/core/<domain>.ts` (export async functions that operate on `Project` objects).
2. Add a thin REST adapter under `src/routes/<domain>.ts` that calls the core functions.
3. Add a corresponding MCP tool file under `src/mcp/<domain>.ts` and register it in `src/mcp/index.ts` so MCP clients see the tool.
4. Update `openapi.json` when adding or changing REST endpoints.
5. Respect `fs-safe` helpers and `safeResolvePath` for any filesystem access to avoid escape vulnerabilities.

## File patching specifics (be precise)
- Supported `operation.type` values (see `src/core/files.ts`): `diff`, `replace`, `lines`, `insert`, `code_block`.
- Many endpoints support a `preview` flag that returns `original_hash`, `modified_hash`, `bytes_before`, `bytes_after`, and a short `diff_preview` instead of writing changes.
- The `expected_hash` parameter triggers a 409 on mismatch; use it to implement optimistic concurrency when editing files.

## Integration and transports
- MCP transports available: streamable HTTP (`POST /mcp`) and SSE (`GET /mcp-sse` + `POST /mcp-messages`). Look at `src/server.ts` for how transports are wired.
- PM2 integration is exposed by `src/core/pm2.ts` and `src/routes/pm2.ts` — ensure PM2 is installed for end-to-end testing of process management.

## Debugging tips
- Use `pnpm dev` (ts-node-dev) for fast iteration with TypeScript.
- Logs use `pino` (see `src/server.ts`) — check console output for structured logs.
- To test file patches locally: create a small repo under `WORKSPACE_ROOT/projects`, then call the patch endpoints or use the MCP tools.

## Where to look for additional docs
- Developer / API docs: `docs/api/*`, `docs/how-to-use/*`, and `docs/deploy/*`.
- Examples for using MCP and REST with ChatGPT and Copilot are in `docs/how-to-use`.

## Non-goals / constraints to respect
- The project intentionally confines operations to `WORKSPACE_ROOT` and by default disallows network operations. Do not make assumptions that git/network access is always available unless `ALLOW_NETWORK` is explicitly set.

---
If anything here is unclear or you'd like more examples (unit tests, example MCP tool, or a small end-to-end runbook), tell me which section to expand and I will iterate.

## Examples

- REST example — apply a unified diff (traditional patch):

  POST `/projects/:projectId/files/diff`

  Request body (JSON):

  {
    "path": "src/some/file.ts",
    "patch": "--- a/src/some/file.ts\n+++ b/src/some/file.ts\n@@ -1,3 +1,4 @@\n+// new line\n",
    "expected_hash": "<optional-current-hash>",
    "preview": true
  }

  Response (preview): contains `original_hash`, `modified_hash`, `bytes_before`, `bytes_after`, and `diff_preview`.

- REST example — replace text (convenience endpoint):

  PATCH `/projects/:projectId/files/replace`

  Request body (JSON):

  {
    "path": "src/index.ts",
    "find": "oldText",
    "replace": "newText",
    "all": true,
    "regex": false,
    "preview": true
  }

- Short `curl` example (preview a replace):

  ```bash
  curl -X PATCH \
    -H "Content-Type: application/json" \
    --data '{"path":"src/index.ts","find":"foo","replace":"bar","all":true,"preview":true}' \
    "http://localhost:3007/projects/my-project/files/replace"
  ```

- MCP tool snippet (example only) — register a small tool that calls the core `patchFile` function. Add to `src/mcp/` and register it in `src/mcp/index.ts`:

  ```ts
  // src/mcp/example-patch.ts
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
  import { getProject } from '../core/projects';
  import { patchFile } from '../core/files';

  export function registerExamplePatchTool(mcp: McpServer) {
    mcp.registerTool({
      name: 'example-patch',
      description: 'Apply a patch to a file (example)',
      async handler(params) {
        const project = await getProject(params.projectId);
        return await patchFile(project, params.payload);
      }
    });
  }
  ```

  Note: this is illustrative — existing MCP tools use the `src/mcp/*` modular pattern and are registered from `src/mcp/index.ts`.

