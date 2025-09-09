import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { Project } from '../types/common';
import { idemCache } from '../lib/idem';
import { exec } from 'child_process';

const projectStateDir = path.join('.state');

const ProjectSourceSchema = z.union([
  z.object({ git: z.object({ url: z.string(), branch: z.string().default('main'), depth: z.number().default(1), token_env: z.string().optional() }) }),
  z.object({ local: z.object({ mount: z.string(), path: z.string() }) }),
  z.object({ archiveUrl: z.string().url(), extract_to: z.string() }),
  z.object({ adopt: z.object({ path: z.string() }) })
]);

const ProjectCreateSchema = z.object({
  source: ProjectSourceSchema,
  name: z.string().min(1)
});

const ProjectRespSchema = z.object({
  project_id: z.string(),
  root: z.string()
});

export default async function (fastify: FastifyInstance) {
  // POST /projects
  fastify.post('/', async (req, reply) => {
    const parse = ProjectCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    const { source, name } = parse.data;
    const idemKey = req.headers['idempotency-key'] as string | undefined;
    if (idemKey) {
      const cached = idemCache.get(req.method, req.url, idemKey);
      if (cached) return reply.send(cached);
    }
    let projectId = 'prj_' + Math.random().toString(36).slice(2, 10);
    let rootAbsPath = '';
    if ('git' in source) {
      if (!config.allowNetwork) return reply.status(501).send({ error: 'Network not allowed' });
      // Prepare clone path
      rootAbsPath = path.join(config.workspaceRoot, 'projects', projectId);
      // Check if directory already exists and is not empty
      try {
        await fs.access(rootAbsPath);
        const files = await fs.readdir(rootAbsPath);
        if (files.length > 0) {
          return reply.status(409).send({ error: 'Project directory already exists and is not empty' });
        }
      } catch {
        await fs.mkdir(rootAbsPath, { recursive: true });
      }
      // Prepare git clone command
      const { url, branch = 'main', depth = 1, token_env } = source.git;
      let cloneUrl = url;
      if (token_env && process.env[token_env]) {
        // Insert token into URL for private repos
        cloneUrl = url.replace('https://', `https://${process.env[token_env]}@`);
      }
      const gitCmd = `git clone --branch ${branch} --depth ${depth} ${cloneUrl} "${rootAbsPath}"`;
      try {
        await new Promise((resolve, reject) => {
          exec(gitCmd, (error, stdout, stderr) => {
            if (error) {
              reject({ error: 'Git clone failed', details: stderr || error.message });
            } else {
              resolve(true);
            }
          });
        });
      } catch (err: any) {
        return reply.status(500).send(err);
      }
    } else if ('archiveUrl' in source) {
      return reply.status(501).send({ error: 'Archive download not implemented' });
    } else if ('local' in source) {
      rootAbsPath = path.join(config.workspaceRoot, 'mounts', source.local.mount, source.local.path);
    } else if ('adopt' in source) {
      rootAbsPath = path.resolve(source.adopt.path);
    }
    // Salva metadados mínimos
    const project: Project = { id: projectId, name, rootAbsPath };
    await fs.mkdir(projectStateDir, { recursive: true });
    await fs.writeFile(path.join(projectStateDir, `${projectId}.json`), JSON.stringify(project));
    const resp = { project_id: projectId, root: rootAbsPath };
    if (idemKey) idemCache.set(req.method, req.url, idemKey, resp);
    return resp;
  });

  // GET /projects
  fastify.get('/', async (req, reply) => {
    try {
      const files = await fs.readdir(projectStateDir);
      const projects = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(projectStateDir, file), 'utf-8');
          projects.push(JSON.parse(data));
        }
      }
      return projects;
    } catch {
      return [];
    }
  });

  // GET /projects/:projectId
  fastify.get('/:projectId', async (req, reply) => {
    const file = path.join(projectStateDir, `${(req.params as any).projectId}.json`);
    try {
      const data = await fs.readFile(file, 'utf-8');
      return JSON.parse(data);
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
  });
}
