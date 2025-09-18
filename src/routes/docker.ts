import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { Project } from '../types/common';
import { runProjectDockerfile, getProjectDockerStatus, stopProjectDocker } from '../services/docker';

const DockerRunSchema = z.object({
  dockerfilePath: z.string().default('./Dockerfile'),
  imageName: z.string().optional(),
  containerName: z.string().optional(),
  version: z.string().optional(),
  buildArgs: z.record(z.string()).optional(),
  runArgs: z.array(z.string()).optional(),
});

const DockerStatusSchema = z.object({
  containerName: z.string().optional(),
});

const DockerStopSchema = z.object({
  containerName: z.string().optional(),
});

export default async function (fastify: FastifyInstance) {
  fastify.post('/run', async (req, reply) => {
    const parse = DockerRunSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }

    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      return await runProjectDockerfile(project, parse.data);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  fastify.get('/status', async (req, reply) => {
    const parse = DockerStatusSchema.safeParse(req.query);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }

    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      return await getProjectDockerStatus(project, parse.data.containerName);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post('/stop', async (req, reply) => {
    const parse = DockerStopSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(422).send({ error: 'Validation error', details: parse.error.errors });
    }

    const { config } = require('../config');
    const stateFile = path.join(config.workspaceRoot, '.state', `${(req.params as any).projectId}.json`);
    let project: Project;
    try {
      project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
    } catch {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      return await stopProjectDocker(project, parse.data.containerName);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
