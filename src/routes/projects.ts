import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  const { createProject, renameProject, listProjects, getProject } = await import('../core/projects');

  // POST /projects
  fastify.post('/', async (req, reply) => {
    try {
      const { source, name } = req.body as any;
      const idemKey = req.headers['idempotency-key'] as string | undefined;
      const result = await createProject(source, name, idemKey);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error creating project',
        details: err.details,
      });
    }
  });

  // PATCH /projects/:projectId
  fastify.patch('/:projectId', async (req, reply) => {
    try {
      const { projectId } = req.params as any;
      const { name: newName } = req.body as any;
      const result = await renameProject(projectId, newName);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error renaming project',
        details: err.details,
      });
    }
  });

  // GET /projects
  fastify.get('/', async (_req, reply) => {
    try {
      const projects = await listProjects();
      return reply.send(projects);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error listing projects',
        details: err.details,
      });
    }
  });

  // GET /projects/:projectId
  fastify.get('/:projectId', async (req, reply) => {
    try {
      const { projectId } = req.params as any;
      const project = await getProject(projectId);
      return reply.send(project);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error fetching project',
        details: err.details,
      });
    }
  });
}