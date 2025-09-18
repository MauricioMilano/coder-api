import path from 'path';
import { safeResolvePath } from '../lib/fs-safe';
import { spawnBash } from '../lib/sandbox';
import { Project } from '../types/common';

export interface BashOptions {
  command: string;
  workdir?: string;
  timeout_sec?: number;
  env?: Record<string, string>;
}

export async function runBashCommand(project: Project, options: BashOptions) {
  const absWorkdir = await safeResolvePath(project.rootAbsPath, options.workdir || '/');
  const result = await spawnBash(options.command, {
    cwd: absWorkdir,
    timeoutSec: options.timeout_sec ?? 120,
    env: options.env,
  });
  return result;
}
