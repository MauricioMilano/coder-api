import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';

import { config } from '../config';
import { Project } from '../types/common';
import { idemCache } from '../lib/idem';
import { exec } from 'child_process';

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
}

const projectStateDir = path.join(config.workspaceRoot, '.state');

const ProjectSourceSchema = z.union([
  z.object({ git: z.object({ url: z.string(), branch: z.string().default('main'), depth: z.number().optional(), token_env: z.string().optional() }) }),
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
    let baseId = slugify(name);
    let projectId = baseId;
    let idx = 1;
    while (true) {
      try {
        await fs.access(path.join(projectStateDir, `${projectId}.json`));
        projectId = `${baseId}-${idx++}`;
      } catch {
        break;
      }
    }
    let rootAbsPath = '';
    const projectsRoot = path.join(config.workspaceRoot, 'projects');
    if ('git' in source) {
      if (!config.allowNetwork) return reply.status(501).send({ error: 'Network not allowed' });
      rootAbsPath = path.join(projectsRoot, projectId);
      try {
        await fs.access(rootAbsPath);
        const files = await fs.readdir(rootAbsPath);
        if (files.length > 0) {
          return reply.status(409).send({ error: 'Project directory already exists and is not empty' });
        }
      } catch {
        await fs.mkdir(rootAbsPath, { recursive: true });
      }
      const { url, branch = 'main', depth, token_env } = source.git;
      let cloneUrl = url;
      if (token_env && process.env[token_env]) {
        cloneUrl = url.replace('https://', `https://${process.env[token_env]}@`);
      }
      const depth_cmd = depth ? `--depth ${depth}` : '';
      const gitCmd = `git clone --branch ${branch} ${depth_cmd} ${cloneUrl} "${rootAbsPath}"`;
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
      // Standardize: mount local projects under /projects/{projectId}
      rootAbsPath = path.join(projectsRoot, projectId);
      try {
        await fs.access(rootAbsPath);
      } catch {
        await fs.mkdir(rootAbsPath, { recursive: true });
      }
      // Optionally, copy files from the mount source to the standardized folder (not implemented here)
    } else if ('adopt' in source) {
      // Standardize: move or link adopted project to /projects/{projectId}
      rootAbsPath = path.join(projectsRoot, projectId);
      try {
        await fs.access(rootAbsPath);
      } catch {
        await fs.mkdir(rootAbsPath, { recursive: true });
      }
      // Optionally, copy or move files from the adopted path to the standardized folder (not implemented here)
    }
    const project: Project = { id: projectId, name, rootAbsPath };
    await fs.mkdir(projectStateDir, { recursive: true });
    await fs.writeFile(path.join(projectStateDir, `${projectId}.json`), JSON.stringify(project));
    const resp = { project_id: projectId, root: rootAbsPath };
    if (idemKey) idemCache.set(req.method, req.url, idemKey, resp);
    return resp;

  });

  // PATCH /projects/:projectId
  fastify.patch('/:projectId', async (req, reply) => {
    const { projectId } = req.params as any;
    const { name: newName } = req.body as { name?: string };
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return reply.status(400).send({ error: 'Novo nome inválido' });
    }
    const metaPath = path.join(projectStateDir, `${projectId}.json`);
    let project: Project;
    try {
      const data = await fs.readFile(metaPath, 'utf-8');
      project = JSON.parse(data);
    } catch {
      return reply.status(404).send({ error: 'Projeto não encontrado' });
    }
    const newSlug = slugify(newName);
    let newProjectId = newSlug;
    let idx = 1;
    while (true) {
      try {
        if (newProjectId === projectId) break;
        await fs.access(path.join(projectStateDir, `${newProjectId}.json`));
        newProjectId = `${newSlug}-${idx++}`;
      } catch {
        break;
      }
    }
    // Renomeia pasta se for projeto "git"
    let newRootAbsPath = project.rootAbsPath;
    const projectsRoot = path.join(config.workspaceRoot, 'projects');
    if (project.rootAbsPath.startsWith(projectsRoot + path.sep)) {
      newRootAbsPath = path.join(projectsRoot, newProjectId);
      try {
        await fs.rename(project.rootAbsPath, newRootAbsPath);
      } catch (e) {
        return reply.status(500).send({ error: 'Falha ao renomear pasta', details: (e as any).message });
      }
    }
    // Atualiza metadados
    const newProject: Project = { id: newProjectId, name: newName, rootAbsPath: newRootAbsPath };
    await fs.writeFile(path.join(projectStateDir, `${newProjectId}.json`), JSON.stringify(newProject));
    if (newProjectId !== projectId) {
      await fs.rm(metaPath);
    }
    return { project_id: newProjectId, name: newName, root: newRootAbsPath };
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
