import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = Router({ mergeParams: true });

const initRoutes = async () => {
  const { getFile, createFile, patchFile, deleteFile } = await import('../core/files');

  // GET /projects/:projectId/files
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { path: filePath, encoding } = req.query as { path?: string, encoding?: 'text' | 'base64' };
      if (!filePath) {
        return res.status(400).json({ error: 'path parameter is required' });
      }
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await getFile(project, filePath, encoding || 'text');
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error reading file',
        details: err.details,
      });
    }
  });

  // POST /projects/:projectId/files
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await createFile(project, req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error creating file',
        details: err.details,
      });
    }
  });

  // PATCH /projects/:projectId/files
  router.patch('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await patchFile(project, req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error patching file',
        details: err.details,
      });
    }
  });

  // DELETE /projects/:projectId/files
  router.delete('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await deleteFile(project, req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error deleting file',
        details: err.details,
      });
    }
  });
};

initRoutes();

module.exports = router;