import { Router, Request, Response } from 'express';

const router = Router();

/*
  OpenAPI JSDoc for projects routes - includes request/response schemas
*/

/**
 * @openapi
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Project identifier
 *         name:
 *           type: string
 *         path:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreateProjectRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         source:
 *           type: string
 *           description: Optional git URL or template source
 *         name:
 *           type: string
 *     RenameProjectRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         details:
 *           type: object
 */

const initRoutes = async () => {
  const { createProject, renameProject, listProjects, getProject } = await import('../core/projects');

  /**
   * @openapi
   * /projects:
   *   post:
   *     tags:
   *       - Projects
   *     summary: Create a new project
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProjectRequest'
   *     responses:
   *       '200':
   *         description: Created project
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       '4XX':
   *         description: Client error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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

  /**
   * @openapi
   * /projects/{projectId}:
   *   patch:
   *     tags:
   *       - Projects
   *     summary: Rename an existing project
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RenameProjectRequest'
   *     responses:
   *       '200':
   *         description: Renamed project info
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       '4XX':
   *         description: Client error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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

  /**
   * @openapi
   * /projects:
   *   get:
   *     tags:
   *       - Projects
   *     summary: List projects
   *     responses:
   *       '200':
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Project'
   *       '4XX':
   *         description: Client error
   */
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

  /**
   * @openapi
   * /projects/{projectId}:
   *   get:
   *     tags:
   *       - Projects
   *     summary: Get project details
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Project details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       '404':
   *         description: Not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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