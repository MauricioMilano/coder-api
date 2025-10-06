import fs from 'fs/promises';
import path from 'path';
import { safeResolvePath } from '../lib/fs-safe';
import type { Project } from '../types/common';

export interface FiletreeOptions {
  path?: string;
  depth?: number;
  glob?: string;
  max_entries?: number;
}

export async function listFiletree(project: Project, options: FiletreeOptions) {
  const { path: userPath = '/', depth = 2, max_entries = 2000 } = options;
  const absRoot = project.rootAbsPath;
  const absPath = await safeResolvePath(absRoot, userPath);
  const nodes: string[] = [];
  let truncated = false;

  async function walk(dir: string, currentDepth: number) {
    if (nodes.length >= max_entries) {
      truncated = true;
      return;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(absRoot, fullPath);
      const displayPath = '/' + relPath;

      nodes.push(displayPath);

      if (entry.isDirectory() && currentDepth < depth) {
        await walk(fullPath, currentDepth + 1);
      }

      if (nodes.length >= max_entries) {
        truncated = true;
        return;
      }
    }
  }

  await walk(absPath, 0);
  return { files: nodes, truncated };
}