import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import readline from 'readline';
import { safeResolvePath } from '../lib/fs-safe';
import { Project } from '../types/common';

const SearchQuery = z.object({
  path: z.string().default('/'),
  query: z.string().min(1),
  regex: z.coerce.boolean().default(false),
  case_sensitive: z.coerce.boolean().default(false),
  max_results: z.coerce.number().default(200)
});

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const parse = SearchQuery.safeParse(req.query);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }

    const data = parse.data;

    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const absRoot = project.rootAbsPath;
    const absPath = await safeResolvePath(absRoot, data.path);

    const results: any[] = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          // detecta binário (heurística simples)
          try {
            const buffer = await fs.readFile(fullPath);
            if (buffer.includes(0)) continue; // ignora arquivos binários
          } catch {
            continue;
          }

          try {
            const rl = readline.createInterface({
              input: fsSync.createReadStream(fullPath, { encoding: 'utf-8' }),
              crlfDelay: Infinity
            });

            let lineNum = 0;
            for await (const line of rl) {
              lineNum++;
              let matches: RegExpMatchArray | null = null;

              if (data.regex) {
                try {
                  const re = new RegExp(data.query, data.case_sensitive ? '' : 'i');
                  matches = line.match(re);
                } catch (e) {
                  return reply.status(400).send({ error: 'Invalid regex', details: (e as any).message });
                }
              } else {
                const haystack = data.case_sensitive ? line : line.toLowerCase();
                const needle = data.case_sensitive ? data.query : data.query.toLowerCase();
                if (haystack.includes(needle)) {
                  const index = haystack.indexOf(needle);
                  matches = [line.substr(index, data.query.length)];
                }
              }

              if (matches) {
                for (const m of matches) {
                  results.push({
                    file: path.relative(absRoot, fullPath),
                    line,
                    line_number: lineNum,
                    match: m
                  });
                  if (results.length >= data.max_results) return;
                }
              }
            }
          } catch {
            continue; // ignora arquivos ilegíveis
          }
        }
        if (results.length >= data.max_results) return;
      }
    }

    await walk(absPath);

    return { results };
  });
}
