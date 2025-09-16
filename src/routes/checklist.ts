import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath } from '../lib/fs-safe';
import { Project } from '../types/common';

const ChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean().default(false)
});

const ChecklistItemCreateSchema = z.object({
  text: z.string().min(1)
});

const ChecklistItemUpdateSchema = z.object({
  id: z.string(),
  text: z.string().min(1).optional(),
  completed: z.boolean().optional()
});

function parseChecklistMarkdown(md: string) {
  // Parse checklist.md into array of {id, text, completed}
  const lines = md.split('\n');
  const items = [];
  for (const line of lines) {
    const match = /^- \[( |x)\] (.+?)(?: <!-- id:(\w+) -->)?$/.exec(line);
    if (match) {
      items.push({
        id: match[3] || Buffer.from(match[2]).toString('hex').slice(0, 8),
        text: match[2],
        completed: match[1] === 'x',
      });
    }
  }
  return items;
}

function toChecklistMarkdown(items: {id: string, text: string, completed: boolean}[]) {
  return items.map(item => `- [${item.completed ? 'x' : ' '}] ${item.text} <!-- id:${item.id} -->`).join('\n');
}

export default async function (fastify: FastifyInstance) {
  // GET /projects/:projectId/checklist
  fastify.get('/', async (req, reply) => {
    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absChecklist = await safeResolvePath(project.rootAbsPath, 'checklist.md');
    let md = '';
    try {
      md = await fs.readFile(absChecklist, 'utf-8');
    } catch { /* not found, empty checklist */ }
    return { items: parseChecklistMarkdown(md) };
  });

  // POST /projects/:projectId/checklist
  fastify.post('/', async (req, reply) => {
    const parse = ChecklistItemCreateSchema.safeParse(req.body);
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
    const absChecklist = await safeResolvePath(project.rootAbsPath, 'checklist.md');
    let md = '';
    try {
      md = await fs.readFile(absChecklist, 'utf-8');
    } catch {}
    let items = parseChecklistMarkdown(md);
    const id = Math.random().toString(36).slice(2, 10);
    items.push({ id, text: parse.data.text, completed: false });
    await fs.writeFile(absChecklist, toChecklistMarkdown(items));
    return { id, text: parse.data.text, completed: false };
  });

  // PATCH /projects/:projectId/checklist
  fastify.patch('/', async (req, reply) => {
    const parse = ChecklistItemUpdateSchema.safeParse(req.body);
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
    const absChecklist = await safeResolvePath(project.rootAbsPath, 'checklist.md');
    let md = '';
    try {
      md = await fs.readFile(absChecklist, 'utf-8');
    } catch {}
    let items = parseChecklistMarkdown(md);
    const idx = items.findIndex(i => i.id === parse.data.id);
    if (idx === -1) return reply.status(404).send({ error: 'Checklist item not found' });
    if (parse.data.text !== undefined) items[idx].text = parse.data.text;
    if (parse.data.completed !== undefined) items[idx].completed = parse.data.completed;
    await fs.writeFile(absChecklist, toChecklistMarkdown(items));
    return items[idx];
  });

  // DELETE /projects/:projectId/checklist
  fastify.delete('/', async (req, reply) => {
    const id = (req.body as any)?.id;
    if (!id) return reply.status(422).send({ error: 'Missing id' });
    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absChecklist = await safeResolvePath(project.rootAbsPath, 'checklist.md');
    let md = '';
    try {
      md = await fs.readFile(absChecklist, 'utf-8');
    } catch {}
    let items = parseChecklistMarkdown(md);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return reply.status(404).send({ error: 'Checklist item not found' });
    items.splice(idx, 1);
    await fs.writeFile(absChecklist, toChecklistMarkdown(items));
    return { deleted: true };
  });

  // POST /projects/:projectId/checklist/complete
  fastify.post('/complete', async (req, reply) => {
    const id = (req.body as any)?.id;
    if (!id) return reply.status(422).send({ error: 'Missing id' });
    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const absChecklist = await safeResolvePath(project.rootAbsPath, 'checklist.md');
    let md = '';
    try {
      md = await fs.readFile(absChecklist, 'utf-8');
    } catch {}
    let items = parseChecklistMarkdown(md);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return reply.status(404).send({ error: 'Checklist item not found' });
    items[idx].completed = true;
    await fs.writeFile(absChecklist, toChecklistMarkdown(items));
    return items[idx];
  });
}
