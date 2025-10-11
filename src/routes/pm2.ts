import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = Router({ mergeParams: true });

const initRoutes = async () => {
  const { 
    startPM2App,
    stopPM2App,
    restartPM2App,
    deletePM2App,
    listPM2Apps,
    getPM2AppStatus,
    getPM2AppLogs,
    stopAllPM2Apps
  } = await import('../core/pm2');

  // POST /projects/:projectId/pm2/start - Start PM2 application
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const options = {
        name: req.body.name,
        script: req.body.script,
        cwd: req.body.cwd,
        args: req.body.args,
        env: req.body.env,
        instances: req.body.instances,
        watch: req.body.watch || false,
        ignore_watch: req.body.ignore_watch,
        max_memory_restart: req.body.max_memory_restart,
        log_file: req.body.log_file,
        out_file: req.body.out_file,
        error_file: req.body.error_file,
        merge_logs: req.body.merge_logs || false,
        time: req.body.time || false
      };
      
      const result = await startPM2App(project, options);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error starting PM2 application',
        details: err.details,
      });
    }
  });

  // POST /projects/:projectId/pm2/stop - Stop PM2 application
  router.post('/stop', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const result = await stopPM2App(project, req.body.nameOrId);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error stopping PM2 application',
        details: err.details,
      });
    }
  });

  // POST /projects/:projectId/pm2/restart - Restart PM2 application
  router.post('/restart', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const result = await restartPM2App(project, req.body.nameOrId);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error restarting PM2 application',
        details: err.details,
      });
    }
  });

  // DELETE /projects/:projectId/pm2 - Delete PM2 application
  router.delete('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const result = await deletePM2App(project, req.body.nameOrId);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error deleting PM2 application',
        details: err.details,
      });
    }
  });

  // GET /projects/:projectId/pm2/health - Check PM2 installation and health
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const { checkPM2Installation } = await import('../core/pm2');
      const result = await checkPM2Installation();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        error: err.message || 'Error checking PM2 health',
        details: err.details,
      });
    }
  });

  // GET /projects/:projectId/pm2/list - List PM2 applications
  router.get('/list', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const result = await listPM2Apps(project);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error listing PM2 applications',
        details: err.details,
      });
    }
  });

  // GET /projects/:projectId/pm2/status - Get PM2 application status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { nameOrId } = req.query as { nameOrId?: string };
      
      if (!nameOrId) {
        return res.status(400).json({ error: 'nameOrId parameter is required' });
      }
      
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const result = await getPM2AppStatus(project, nameOrId);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error getting PM2 application status',
        details: err.details,
      });
    }
  });

  // GET /projects/:projectId/pm2/logs - Get PM2 application logs
  router.get('/logs', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { nameOrId, lines } = req.query as { nameOrId?: string; lines?: string };
      
      if (!nameOrId) {
        return res.status(400).json({ error: 'nameOrId parameter is required' });
      }
      
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const logLines = lines ? parseInt(lines, 10) : 100;
      const result = await getPM2AppLogs(project, nameOrId, logLines);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error getting PM2 application logs',
        details: err.details,
      });
    }
  });

  // POST /projects/:projectId/pm2/kill-all - Stop all PM2 applications
  router.post('/kill-all', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const result = await stopAllPM2Apps(project);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error stopping all PM2 applications',
        details: err.details,
      });
    }
  });
};

initRoutes();

module.exports = router;