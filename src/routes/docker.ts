import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath } from '../lib/fs-safe';
import { spawnBash } from '../lib/sandbox';
import { Project } from '../types/common';

// Schema for running a Dockerfile
const DockerRunSchema = z.object({
    dockerfilePath: z.string().default('./Dockerfile'),
    imageName: z.string().optional(),
    containerName: z.string().optional(),
    version: z.string().optional(), // Add version field
    buildArgs: z.record(z.string()).optional(),
    runArgs: z.array(z.string()).optional(),
});

// Schema for getting Docker container status
const DockerStatusSchema = z.object({
    containerName: z.string().optional(),
});

// Schema for stopping Docker containers
const DockerStopSchema = z.object({
    containerName: z.string().optional(),
});

export default async function (fastify: FastifyInstance) {
    // POST /projects/{projectId}/docker/run
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
        } catch (e) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        const { dockerfilePath, imageName, containerName, version, buildArgs, runArgs } = parse.data;

        const absDockerfileDir = await safeResolvePath(project.rootAbsPath, path.dirname(dockerfilePath));
        const absDockerfilePath = path.join(absDockerfileDir, path.basename(dockerfilePath));

        try {
            await fs.access(absDockerfilePath); // Check if Dockerfile exists
        } catch (e) {
            return reply.status(404).send({ error: `Dockerfile not found at ${dockerfilePath}` });
        }

        // Generate default image and container names if not provided
        const baseImageName = imageName || `project-${(req.params as any).projectId}-image`;
        const finalImageName = version ? `${baseImageName}:${version}` : baseImageName;
        const baseContainerName = containerName || `project-${(req.params as any).projectId}-container`;
        const finalContainerName = version ? `${baseContainerName}-${version}` : baseContainerName;

        // Build command
        let buildCommand = `docker build -t ${finalImageName} -f ${absDockerfilePath} .`;
        if (buildArgs) {
            for (const key in buildArgs) {
                buildCommand += ` --build-arg ${key}=${buildArgs[key]}`;
            }
        }

        // Run build command
        const buildResult = await spawnBash(buildCommand, { cwd: absDockerfileDir });
        if (buildResult.exit_code !== 0) {
            return reply.status(400).send({ error: 'Docker build failed', details: buildResult.stderr });
        }

        // Run command
        let runCommand = `docker run -d --name ${finalContainerName} `;
        if (runArgs) {
            runCommand += runArgs.join(' ') + ' ';
        }
        runCommand += finalImageName;

        // Run container command
        const runResult = await spawnBash(runCommand, { cwd: absDockerfileDir });
        if (runResult.exit_code !== 0) {
            return reply.status(400).send({ error: 'Docker run failed', details: runResult.stderr });
        }

        return reply.status(200).send({ message: 'Dockerfile built and container started successfully', build_output: buildResult.stdout, run_output: runResult.stdout, container_name: finalContainerName, image_name: finalImageName });
    });

    // GET /projects/{projectId}/docker/status
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
        } catch (e) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        const { containerName } = parse.data;

        // Filter containers by project ID by convention
        const projectIdFilter = `project-${(req.params as any).projectId}-container`;

        let command = `docker ps --format \"{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}\" --filter name=^/${projectIdFilter}.*`;

        if (containerName) {
            command += ` -f name=^/${containerName}$`; // Further filter by exact container name if provided
        }

        const result = await spawnBash(command, { cwd: project.rootAbsPath });

        if (result.exit_code !== 0) {
            return reply.status(500).send({ error: 'Failed to get Docker container status', details: result.stderr });
        }

        const lines = result.stdout.trim().split('\n');
        const containers = lines.filter(line => line.length > 0).map(line => {
            const [id, name, status, ports, image] = line.split('\t');
            return { id, name, status, ports, image };
        });

        return reply.status(200).send({ containers });
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
        } catch (e) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        const { containerName } = parse.data;

        let command: string;
        if (containerName) {
            // Stop a specific container
            command = `docker stop ${containerName}`;
        } else {
            // Stop all containers for the project
            const projectIdFilter = `project-${(req.params as any).projectId}-container`;
            command = `docker stop $(docker ps -a --filter name=^/${projectIdFilter}.* --format "{{.Names}}")`;
        }

        const result = await spawnBash(command, { cwd: project.rootAbsPath });

        // Docker stop returns exit code 1 if container is not found or already stopped,
        // but we might want to consider it a success if no containers were found to stop.
        // We'll check stderr for specific messages to determine success/failure.
        if (result.exit_code !== 0 && !result.stderr.includes("No such container") && !result.stderr.includes("is not running")) {
            return reply.status(500).send({ error: 'Failed to stop Docker container(s)', details: result.stderr });
        }

        // If no containers were stopped (e.g., command returned nothing), we can infer success
        const stoppedContainers = result.stdout.trim().split(/\s+/).filter(Boolean);
        if (stoppedContainers.length === 0 && !containerName) {
            return reply.status(200).send({ message: 'No project containers found or running to stop.' });
        }

        return reply.status(200).send({ message: 'Docker container(s) stopped successfully', stopped: stoppedContainers });
    });
}
