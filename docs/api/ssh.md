# SSH API (Experimental)

> Availability: Controlled by `SSH_ENABLED` env var. Set `SSH_ENABLED=true` to enable endpoints and MCP tools.

## REST Endpoints

### Generate SSH key
POST `/projects/:projectId/ssh/keygen`

Body:
```json
{
  "type": "ed25519|rsa",
  "bits": 4096,
  "comment": "coder-api",
  "overwrite": false
}
```

Response:
```json
{
  "generated": true,
  "private_key_path": "/abs/path/.ssh/id_ed25519",
  "public_key_path": "/abs/path/.ssh/id_ed25519.pub",
  "public_key": "ssh-ed25519 AAAA... coder-api"
}
```

### Read public key
GET `/projects/:projectId/ssh/public-key?type=ed25519|rsa`

Response:
```json
{ "type": "ed25519", "public_key_path": ".../.ssh/id_ed25519.pub", "public_key": "ssh-ed25519 AAAA..." }
```

## MCP Tools

- `ssh-keygen` — Generate SSH key (same params as REST)
- `ssh-public-key` — Read public key (params: `projectId`, `type`)

> These tools are registered only when `SSH_ENABLED=true`.

## Notes
- Keys are created under the project workspace `.ssh/` folder.
- Private key is never returned in responses.
- Overwrite guard prevents accidental key replacement unless `overwrite=true`.
- Requires `ssh-keygen` available in the runtime container/host.
