import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath } from '../lib/fs-safe';
import { Project } from '../types/common';

const SearchQuery = z.object({
  path: z.string().default('/'),
  query: z.string().min(1),
  regex: z.boolean().default(false),
  case_sensitive: z.boolean().default(false),
  max_results: z.number().default(200)
});

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const parse = SearchQuery.safeParse(req.query);
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

    const absRoot = project.rootAbsPath;
    const absPath = await safeResolvePath(absRoot, parse.data.path);

    const results: any[] = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const content = await fs.readFile(fullPath, 'utf-8').catch(() => '');
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            let match = null;
            if (parse.data.regex) {
              try {
                const re = new RegExp(parse.data.query, parse.data.case_sensitive ? '' : 'i');
                match = lines[i].match(re);
              } catch (e) {
                return reply.status(400).send({ error: 'Invalid regex', details: (e as any).message });
              }
            } else {
              const haystack = parse.data.case_sensitive ? lines[i] : lines[i].toLowerCase();
              const needle = parse.data.case_sensitive ? parse.data.query : parse.data.query.toLowerCase();
              if (haystack.includes(needle)) match = [parse.data.query];
            }
            if (match) {
              results.push({ file: path.relative(absRoot, fullPath), line: lines[i], line_number: i + 1, match: match[0] });
              if (results.length >= parse.data.max_results) return;
            }
          }
        }
      }
    }

    await walk(absPath);

    return { results };
  });
}
