import fs from 'fs/promises';
import path from 'path';
import { spawnBash } from '../lib/sandbox';
import { safeResolvePath } from '../lib/fs-safe';
import { Project } from '../types/common';
import { z } from 'zod';

const KeyGenSchema = z.object({
  type: z.enum(['ed25519','rsa']).default('ed25519'),
  bits: z.number().default(4096), // only used for rsa
  comment: z.string().default('coder-api'),
  overwrite: z.boolean().default(false)
});

function getSshDir(base: string) {
  return path.join(base, '.ssh');
}

export async function generateSshKey(project: Project, body: any) {
  const { config } = require('../config');
  if (!(config as any).sshEnabled) {
    throw { statusCode: 403, message: 'SSH features are disabled by configuration' };
  }

  const parsed = KeyGenSchema.safeParse(body || {});
  if (!parsed.success) {
    throw { statusCode: 422, message: 'Validation error', details: parsed.error.errors };
  }
  const { type, bits, comment, overwrite } = parsed.data;

  const sshDir = getSshDir(project.rootAbsPath);
  await fs.mkdir(sshDir, { recursive: true });
  const keyPath = path.join(sshDir, 'id_' + (type === 'ed25519' ? 'ed25519' : 'rsa'));
  // Check existence properly (do not swallow our own errors)
  let exists = false;
  try {
    await fs.access(keyPath);
    exists = true;
  } catch (e: any) {
    if (e && e.code !== 'ENOENT') throw e;
  }

  if (exists && !overwrite) {
    throw { statusCode: 409, message: 'SSH key already exists', path: keyPath };
  }

  if (exists && overwrite) {
    await fs.rm(keyPath, { force: true });
    await fs.rm(keyPath + '.pub', { force: true });
  }

  const args = type === 'ed25519'
    ? `ssh-keygen -q -t ed25519 -C "${comment}" -f "${keyPath}" -N ""`
    : `ssh-keygen -q -t rsa -b ${bits} -C "${comment}" -f "${keyPath}" -N ""`;

  const result = await spawnBash(args, { cwd: project.rootAbsPath, timeoutSec: 60 });
  const pubKey = await fs.readFile(keyPath + '.pub', 'utf-8');
  return {
    generated: true,
    private_key_path: keyPath,
    public_key_path: keyPath + '.pub',
    public_key: pubKey.trim(),
    stdout: result.stdout,
    stderr: result.stderr
  };
}

export async function getPublicSshKey(project: Project, body?: any) {
  const { config } = require('../config');
  if (!(config as any).sshEnabled) {
    throw { statusCode: 403, message: 'SSH features are disabled by configuration' };
  }
  const type = body?.type === 'rsa' ? 'rsa' : 'ed25519';
  const sshDir = getSshDir(project.rootAbsPath);
  const keyPath = path.join(sshDir, 'id_' + (type === 'ed25519' ? 'ed25519' : 'rsa') + '.pub');
  const abs = await safeResolvePath(project.rootAbsPath, path.relative(project.rootAbsPath, keyPath));
  const pub = await fs.readFile(abs, 'utf-8').catch(() => {
    throw { statusCode: 404, message: 'Public key not found', path: keyPath };
  });
  return { type, public_key_path: keyPath, public_key: pub.trim() };
}
