import { Router, Request, Response } from 'express';

const router = Router();

const initRoutes = async () => {
  const { createProject, renameProject, listProjects, getProject } = await import('../core/projects');

  // POST /projects
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { source, name } = req.body;
      const idemKey = req.headers['idempotency-key'] as string | undefined;
      const result = await createProject(source, name, idemKey);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error creating project',
        details: err.details,
      });
    }
  });

  // PATCH /projects/:projectId
  router.patch('/:projectId', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { name: newName } = req.body;
      const result = await renameProject(projectId, newName);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error renaming project',
        details: err.details,
      });
    }
  });

  // GET /projects
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const projects = await listProjects();
      return res.json(projects);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error listing projects',
        details: err.details,
      });
    }
  });

  // GET /projects/:projectId
  router.get('/:projectId', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const project = await getProject(projectId);
      return res.json(project);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error fetching project',
        details: err.details,
      });
    }
  });
};

initRoutes();

module.exports = router;