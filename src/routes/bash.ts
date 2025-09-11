import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath } from '../lib/fs-safe';
import { spawnBash } from '../lib/sandbox';
import { Project } from '../types/common';

const BashSchema = z.object({
  command: z.string().min(1),
  workdir: z.string().default('/'),
  timeout_sec: z.number().default(120),
  env: z.record(z.string()).optional()
});

export default async function (fastify: FastifyInstance) {
  fastify.post('/', async (req, reply) => {
    const parse = BashSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
  const { config } = require('../config');
  const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absWorkdir = await safeResolvePath(project.rootAbsPath, parse.data.workdir);
    const result = await spawnBash(parse.data.command, {
      cwd: absWorkdir,
      timeoutSec: parse.data.timeout_sec,
      env: parse.data.env,
    });
    return result;
  });
}
