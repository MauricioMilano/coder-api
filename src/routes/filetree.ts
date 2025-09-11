import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath } from '../lib/fs-safe';
import { Project } from '../types/common';
import { sha256 } from '../lib/hashing';

const FiletreeQuery = z.object({
  path: z.string().default('/'),
  depth: z.coerce.number().default(2),
  glob: z.string().optional(),
  max_entries: z.coerce.number().default(2000)
});

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const parse = FiletreeQuery.safeParse(req.query);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    const { path: userPath, depth, max_entries } = parse.data;
    // Carrega metadados do projeto
  const { config } = require('../config');
  const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absRoot = project.rootAbsPath;
    const absPath = await safeResolvePath(absRoot, userPath || '/');
    const nodes: any[] = [];
    let truncated = false;
    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(absRoot, fullPath);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          nodes.push('/' + relPath);
        }
      }
    }
    await walk(absPath);
    return { files: nodes };
  });
}
