import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs/promises';

export default async function (fastify: FastifyInstance) {
  const { getFile, createFile, patchFile, deleteFile } = await import('../core/files');

  // GET /projects/:projectId/files
  fastify.get('/', async (req, reply) => {
    try {
      const { projectId } = req.params as any;
      const { path: filePath, encoding } = req.query as any;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await getFile(project, filePath, encoding);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error reading file',
        details: err.details,
      });
    }
  });

  // POST /projects/:projectId/files
  fastify.post('/', async (req, reply) => {
    try {
      const { projectId } = req.params as any;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await createFile(project, req.body);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error creating file',
        details: err.details,
      });
    }
  });

  // PATCH /projects/:projectId/files
  fastify.patch('/', async (req, reply) => {
    try {
      const { projectId } = req.params as any;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await patchFile(project, req.body);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error patching file',
        details: err.details,
      });
    }
  });

  // DELETE /projects/:projectId/files
  fastify.delete('/', async (req, reply) => {
    try {
      const { projectId } = req.params as any;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await deleteFile(project, req.body);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        error: err.message || 'Error deleting file',
        details: err.details,
      });
    }
  });
}