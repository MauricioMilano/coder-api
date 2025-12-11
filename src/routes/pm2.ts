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

  /**
   * @openapi
   * /projects/{projectId}/pm2/start:
   *   post:
   *     tags:
   *       - PM2
   *     summary: Start a PM2 application for a project
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PM2AppOptions'
   *     responses:
   *       '200':
   *         description: Started process information
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PM2AppInfo'
   */
  router.post('/start', async (req: Request, res: Response) => {
    try {
      // projectId is ignored for PM2 operations (PM2 is global), keep path param for compatibility if needed;
      // projectId is ignored for PM2 operations (PM2 is global)
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
      
      const result = await startPM2App(options);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error starting PM2 application',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/pm2/stop:
   *   post:
   *     tags:
   *       - PM2
   *     summary: Stop a PM2 application
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nameOrId:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Stop result
   */
  router.post('/stop', async (req: Request, res: Response) => {
    try {
      // projectId is ignored for PM2 operations (PM2 is global)
      const result = await stopPM2App(req.body.nameOrId);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error stopping PM2 application',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/pm2/restart:
   *   post:
   *     tags:
   *       - PM2
   *     summary: Restart a PM2 application
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nameOrId:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Restart result
   */
  router.post('/restart', async (req: Request, res: Response) => {
    try {
      // projectId is ignored for PM2 operations (PM2 is global)
      const result = await restartPM2App(req.body.nameOrId);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error restarting PM2 application',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/pm2:
   *   delete:
   *     tags:
   *       - PM2
   *     summary: Delete PM2 application
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nameOrId:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Deletion result
   */
  router.delete('/', async (req: Request, res: Response) => {
    try {
      // projectId is ignored for PM2 operations (PM2 is global)
      const result = await deletePM2App(req.body.nameOrId);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error deleting PM2 application',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/pm2/health:
   *   get:
   *     tags:
   *       - PM2
   *     summary: Check PM2 installation and health
   *     responses:
   *       '200':
   *         description: Health check result
   */
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

  /**
   * @openapi
   * /projects/{projectId}/pm2/list:
   *   get:
   *     tags:
   *       - PM2
   *     summary: List PM2 applications for a project
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: List of PM2 apps
   */
  router.get('/list', async (req: Request, res: Response) => {
    try {
      // projectId is ignored for PM2 operations (PM2 is global)
      const result = await listPM2Apps();
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error listing PM2 applications',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/pm2/status:
   *   get:
   *     tags:
   *       - PM2
   *     summary: Get PM2 application status
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: nameOrId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Status info
   */
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

  /**
   * @openapi
   * /projects/{projectId}/pm2/logs:
   *   get:
   *     tags:
   *       - PM2
   *     summary: Get PM2 application logs
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: nameOrId
   *         schema:
   *           type: string
   *       - in: query
   *         name: lines
   *         schema:
   *           type: integer
   *     responses:
   *       '200':
   *         description: Logs
   */
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

  /**
   * @openapi
   * /projects/{projectId}/pm2/kill-all:
   *   post:
   *     tags:
   *       - PM2
   *     summary: Stop all PM2 applications for a project
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Result of stopping all apps
   */
  router.post('/kill-all', async (req: Request, res: Response) => {
    try {
      // projectId is ignored for PM2 operations (PM2 is global)
      const result = await stopAllPM2Apps();
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