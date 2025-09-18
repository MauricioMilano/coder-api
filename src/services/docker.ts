import path from 'path';
import fs from 'fs/promises';
import { safeResolvePath } from '../lib/fs-safe';
import { spawnBash } from '../lib/sandbox';
import { Project } from '../types/common';

export interface DockerRunOptions {
  dockerfilePath?: string;
  imageName?: string;
  containerName?: string;
  version?: string;
  buildArgs?: Record<string, string>;
  runArgs?: string[];
}

export async function runProjectDockerfile(project: Project, options: DockerRunOptions) {
  const dockerfilePath = options.dockerfilePath || './Dockerfile';
  const absDockerfileDir = await safeResolvePath(project.rootAbsPath, path.dirname(dockerfilePath));
  const absDockerfilePath = path.join(absDockerfileDir, path.basename(dockerfilePath));

  try {
    await fs.access(absDockerfilePath);
  } catch {
    throw new Error(`Dockerfile not found at ${dockerfilePath}`);
  }

  const baseImageName = options.imageName || `project-${project.id}-image`;
  const finalImageName = options.version ? `${baseImageName}:${options.version}` : baseImageName;
  const baseContainerName = options.containerName || `project-${project.id}-container`;
  const finalContainerName = options.version ? `${baseContainerName}-${options.version}` : baseContainerName;

  let buildCommand = `docker build -t ${finalImageName} -f ${absDockerfilePath} .`;
  if (options.buildArgs) {
    for (const key in options.buildArgs) {
      buildCommand += ` --build-arg ${key}=${options.buildArgs[key]}`;
    }
  }

  const buildResult = await spawnBash(buildCommand, { cwd: absDockerfileDir });
  if (buildResult.exit_code !== 0) {
    throw new Error(`Docker build failed: ${buildResult.stderr}`);
  }

  let runCommand = `docker run -d --name ${finalContainerName} `;
  if (options.runArgs) {
    runCommand += options.runArgs.join(' ') + ' ';
  }
  runCommand += finalImageName;

  const runResult = await spawnBash(runCommand, { cwd: absDockerfileDir });
  if (runResult.exit_code !== 0) {
    throw new Error(`Docker run failed: ${runResult.stderr}`);
  }

  return {
    message: 'Dockerfile built and container started successfully',
    build_output: buildResult.stdout,
    run_output: runResult.stdout,
    container_name: finalContainerName,
    image_name: finalImageName
  };
}

export async function getProjectDockerStatus(project: Project, containerName?: string) {
  const projectIdFilter = `project-${project.id}-container`;
  let command = `docker ps --format \"{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}\" --filter name=^/${projectIdFilter}.*`;

  if (containerName) {
    command += ` -f name=^/${containerName}$`;
  }

  const result = await spawnBash(command, { cwd: project.rootAbsPath });

  if (result.exit_code !== 0) {
    throw new Error(`Failed to get Docker container status: ${result.stderr}`);
  }

  const lines = result.stdout.trim().split('\n');
  const containers = lines.filter(line => line.length > 0).map(line => {
    const [id, name, status, ports, image] = line.split('\t');
    return { id, name, status, ports, image };
  });

  return { containers };
}

export async function stopProjectDocker(project: Project, containerName?: string) {
  let command: string;
  if (containerName) {
    command = `docker stop ${containerName}`;
  } else {
    const projectIdFilter = `project-${project.id}-container`;
    command = `docker stop $(docker ps -a --filter name=^/${projectIdFilter}.* --format \"{{.Names}}\")`;
  }

  const result = await spawnBash(command, { cwd: project.rootAbsPath });

  if (result.exit_code !== 0 && !result.stderr.includes("No such container") && !result.stderr.includes("is not running")) {
    throw new Error(`Failed to stop Docker container(s): ${result.stderr}`);
  }

  const stoppedContainers = result.stdout.trim().split(/\s+/).filter(Boolean);
  if (stoppedContainers.length === 0 && !containerName) {
    return { message: 'No project containers found or running to stop.' };
  }

  return { message: 'Docker container(s) stopped successfully', stopped: stoppedContainers };
}
