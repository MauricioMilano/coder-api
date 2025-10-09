import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';

const router = Router({ mergeParams: true });

const initRoutes = async () => {
  const { listFiletree } = await import('../core/filetree');

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { path: userPath, depth, glob, max_entries } = req.query as { 
        path?: string, 
        depth?: string, 
        glob?: string, 
        max_entries?: string 
      };
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await listFiletree(project, { 
        path: userPath, 
        depth: depth ? parseInt(depth) : undefined, 
        glob, 
        max_entries: max_entries ? parseInt(max_entries) : undefined 
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ error: err.message || 'Error listing filetree', details: err.details });
    }
  });
};

initRoutes();

module.exports = router;