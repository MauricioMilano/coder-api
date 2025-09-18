import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createProject, editProjectName, listProjects, getProject } from '../services/projects';

const ProjectSourceSchema = z.union([
  z.object({ git: z.object({ url: z.string(), branch: z.string().default('main'), depth: z.number().default(1), token_env: z.string().optional() }) }),
  z.object({ local: z.object({ mount: z.string(), path: z.string() }) }),
  z.object({ archiveUrl: z.string().url(), extract_to: z.string() }),
  z.object({ adopt: z.object({ path: z.string() }) })
]);

const ProjectCreateSchema = z.object({
  source: ProjectSourceSchema,
  name: z.string().min(1)
});

export default async function (fastify: FastifyInstance) {
  // POST /projects
  fastify.post('/', async (req, reply) => {
    const parse = ProjectCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }
    try {
      const idemKey = req.headers['idempotency-key'] as string | undefined;
      const result = await createProject(parse.data.source, parse.data.name, idemKey, req.method, req.url);
      return result;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // PATCH /projects/:projectId
  fastify.patch('/:projectId', async (req, reply) => {
    const { projectId } = req.params as any;
    const { name: newName } = req.body as { name?: string };
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return reply.status(400).send({ error: 'Novo nome inválido' });
    }
    try {
      const result = await editProjectName(projectId, newName);
      return result;
    } catch (err: any) {
      if (err.message === 'Project not found') {
        return reply.status(404).send({ error: err.message });
      }
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /projects
  fastify.get('/', async () => {
    return await listProjects();
  });

  // GET /projects/:projectId
  fastify.get('/:projectId', async (req, reply) => {
    const { projectId } = req.params as any;
    try {
      return await getProject(projectId);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
}
