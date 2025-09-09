import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import crypto from 'crypto';

export async function safeResolvePath(projectRoot: string, userPath: string): Promise<string> {
  const joined = path.join(projectRoot, userPath);
  const normalized = path.normalize(joined);
  const real = await fs.realpath(normalized).catch(() => normalized);
  if (!real.startsWith(projectRoot)) {
    throw new Error('Path escapes project root');
  }
  // Check for symlinks escaping root
  const parts = normalized.split(path.sep);
  let curr = projectRoot;
  for (const part of parts.slice(1)) {
    curr = path.join(curr, part);
    try {
      const stat = await fs.lstat(curr);
      if (stat.isSymbolicLink()) {
        const realLink = await fs.realpath(curr);
        if (!realLink.startsWith(projectRoot)) {
          throw new Error('Symlink escapes project root');
        }
      }
    } catch (e) { /* ignore missing */ }
  }
  return normalized;
}

export async function readFileSafe(absPath: string, encoding: 'text' | 'base64' = 'text', maxSize = config.maxFileSize) {
  const stat = await fs.stat(absPath);
  if (stat.size > maxSize) throw new Error('File too large');
  const buf = await fs.readFile(absPath);
  return encoding === 'base64' ? buf.toString('base64') : buf.toString('utf-8');
}

export async function writeFileSafe(absPath: string, content: string, encoding: 'text' | 'base64' = 'text', overwrite = false) {
  try {
    await fs.access(absPath);
    if (!overwrite) throw new Error('File exists');
  } catch { /* not exists, ok */ }
  const dir = path.dirname(absPath);
  await fs.mkdir(dir, { recursive: true });
  const buf = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf-8');
  if (buf.length > config.maxFileSize) throw new Error('File too large');
  await fs.writeFile(absPath, buf);
  return buf.length;
}

export async function deletePathSafe(absPath: string, recursive = false, missingOk = false) {
  try {
    const stat = await fs.lstat(absPath);
    if (stat.isDirectory()) {
      await fs.rm(absPath, { recursive, force: missingOk });
    } else {
      await fs.unlink(absPath);
    }
    return true;
  } catch (e) {
    if (missingOk) return false;
    throw e;
  }
}
