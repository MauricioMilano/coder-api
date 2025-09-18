import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath } from '../lib/fs-safe';
import { Project } from '../types/common';

export interface FiletreeOptions {
  path?: string;
  depth?: number;
  glob?: string;
  max_entries?: number;
}

export async function listFiletree(project: Project, options: FiletreeOptions) {
  const absRoot = project.rootAbsPath;
  const absPath = await safeResolvePath(absRoot, options.path || '/');

  const nodes: string[] = [];
  let truncated = false;

  async function walk(dir: string, currentDepth: number) {
    if (options.max_entries && nodes.length >= options.max_entries) {
      truncated = true;
      return;
    }
    if (options.depth !== undefined && currentDepth > options.depth) {
      return;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(absRoot, fullPath);
      if (entry.isDirectory()) {
        await walk(fullPath, currentDepth + 1);
      } else if (entry.isFile()) {
        nodes.push('/' + relPath);
        if (options.max_entries && nodes.length >= options.max_entries) {
          truncated = true;
          return;
        }
      }
    }
  }

  await walk(absPath, 1);
  return { files: nodes, truncated };
}
