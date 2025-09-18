import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath, readFileSafe, writeFileSafe, deletePathSafe } from '../lib/fs-safe';
import { sha256 } from '../lib/hashing';
import { Project } from '../types/common';
import { idemCache } from '../lib/idem';

export async function readProjectFile(project: Project, filePath: string, encoding: 'text' | 'base64') {
  const absPath = await safeResolvePath(project.rootAbsPath, filePath);
  const content = await readFileSafe(absPath, encoding);
  const hash = sha256(content);
  return { path: filePath, content, hash };
}

export async function createProjectFile(project: Project, data: {
  path: string;
  content: string;
  encoding: 'text' | 'base64';
  overwrite: boolean;
}, idemKey?: string, method: string = 'POST', url: string = '/') {
  if (idemKey) {
    const cached = idemCache.get(method, url, idemKey);
    if (cached) return cached;
  }

  const absPath = await safeResolvePath(project.rootAbsPath, data.path);
  await writeFileSafe(absPath, data.content, data.encoding, data.overwrite);
  const hash = sha256(data.content);
  const resp = { path: data.path, hash };

  if (idemKey) idemCache.set(method, url, idemKey, resp);
  return resp;
}

export async function editProjectFile(project: Project, data: {
  path: string;
  content: string;
  expected_hash?: string;
}) {
  const absPath = await safeResolvePath(project.rootAbsPath, data.path);
  let orig = await fs.readFile(absPath, 'utf-8');

  if (data.expected_hash && sha256(orig) !== data.expected_hash) {
    throw new Error('Hash mismatch');
  }

  let newContent = orig;
  const patchPairs: { search: string; replace: string }[] = [];
  const blockRegex = /\/\/\s*-{6,}\s*SEARCH\s*\n([\s\S]*?)\/\/\s*={6,}\s*\n([\s\S]*?)(?=\/\/\s*\+{6,}\s*REPLACE|$)/g;

  let match;
  while ((match = blockRegex.exec(data.content ?? '')) !== null) {
    const search = match[1].trim();
    const replace = match[2].trim();
    patchPairs.push({ search, replace });
  }

  if (patchPairs.length === 0) {
    throw new Error('No valid patch pairs found in content.');
  }

  for (const { search, replace } of patchPairs) {
    newContent = newContent.replace(search, replace);
  }

  await fs.writeFile(absPath, newContent);
  return {
    path: data.path,
    hash: sha256(newContent),
    bytes_written: Buffer.byteLength(patchPairs.map(p => p.replace).join(""))
  };
}

export async function deleteProjectPath(project: Project, data: {
  path: string;
  recursive: boolean;
  missing_ok: boolean;
}, idemKey?: string, method: string = 'DELETE', url: string = '/') {
  if (idemKey) {
    const cached = idemCache.get(method, url, idemKey);
    if (cached) return cached;
  }

  const absPath = await safeResolvePath(project.rootAbsPath, data.path);
  await deletePathSafe(absPath, data.recursive, data.missing_ok);
  const resp = { deleted: true };

  if (idemKey) idemCache.set(method, url, idemKey, resp);
  return resp;
}
