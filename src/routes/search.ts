import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { searchInProject } from '../core/search';

const router = Router({ mergeParams: true });

const QuerySchema = z.object({
  path: z.string().default('/'),
  query: z.string().min(1),
  regex: z.coerce.boolean().default(false),
  case_sensitive: z.coerce.boolean().default(false),
  max_results: z.coerce.number().default(200)
});

router.get('/', async (req: Request, res: Response) => {
  const parse = QuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(422).json({ error: 'Validation error', details: parse.error.errors });
  }
  const data = parse.data;
  try {
    const { projectId } = req.params;
    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
    const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));

    const result = await searchInProject(project, data);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error searching project', details: err.details });
  }
});

module.exports = router;