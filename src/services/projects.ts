import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { config } from '../config';
import { Project } from '../types/common';
import { idemCache } from '../lib/idem';

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
}

const projectStateDir = path.join(config.workspaceRoot, '.state');

export async function createProject(source: any, name: string, idemKey?: string, method: string = 'POST', url: string = '/') {
  if (idemKey) {
    const cached = idemCache.get(method, url, idemKey);
    if (cached) return cached;
  }

  let baseId = slugify(name);
  let projectId = baseId;
  let idx = 1;
  while (true) {
    try {
      await fs.access(path.join(projectStateDir, `${projectId}.json`));
      projectId = `${baseId}-${idx++}`;
    } catch {
      break;
    }
  }

  let rootAbsPath = '';
  const projectsRoot = path.join(config.workspaceRoot, 'projects');

  if ('git' in source) {
    if (!config.allowNetwork) throw new Error('Network not allowed');
    rootAbsPath = path.join(projectsRoot, projectId);
    try {
      await fs.access(rootAbsPath);
      const files = await fs.readdir(rootAbsPath);
      if (files.length > 0) {
        throw new Error('Project directory already exists and is not empty');
      }
    } catch {
      await fs.mkdir(rootAbsPath, { recursive: true });
    }

    const { url, branch = 'main', depth = 1, token_env } = source.git;
    let cloneUrl = url;
    if (token_env && process.env[token_env]) {
      cloneUrl = url.replace('https://', `https://${process.env[token_env]}@`);
    }
    const gitCmd = `git clone --branch ${branch} --depth ${depth} ${cloneUrl} "${rootAbsPath}"`;
    await new Promise((resolve, reject) => {
      exec(gitCmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(true);
        }
      });
    });
  } else if ('archiveUrl' in source) {
    throw new Error('Archive download not implemented');
  } else if ('local' in source) {
    rootAbsPath = path.join(projectsRoot, projectId);
    try {
      await fs.access(rootAbsPath);
    } catch {
      await fs.mkdir(rootAbsPath, { recursive: true });
    }
  } else if ('adopt' in source) {
    rootAbsPath = path.join(projectsRoot, projectId);
    try {
      await fs.access(rootAbsPath);
    } catch {
      await fs.mkdir(rootAbsPath, { recursive: true });
    }
  }

  const project: Project = { id: projectId, name, rootAbsPath };
  await fs.mkdir(projectStateDir, { recursive: true });
  await fs.writeFile(path.join(projectStateDir, `${projectId}.json`), JSON.stringify(project));

  const resp = { project_id: projectId, root: rootAbsPath };
  if (idemKey) idemCache.set(method, url, idemKey, resp);
  return resp;
}

export async function editProjectName(projectId: string, newName: string) {
  const metaPath = path.join(projectStateDir, `${projectId}.json`);
  let project: Project;
  try {
    const data = await fs.readFile(metaPath, 'utf-8');
    project = JSON.parse(data);
  } catch {
    throw new Error('Project not found');
  }

  const newSlug = slugify(newName);
  let newProjectId = newSlug;
  let idx = 1;
  while (true) {
    try {
      if (newProjectId === projectId) break;
      await fs.access(path.join(projectStateDir, `${newProjectId}.json`));
      newProjectId = `${newSlug}-${idx++}`;
    } catch {
      break;
    }
  }

  let newRootAbsPath = project.rootAbsPath;
  const projectsRoot = path.join(config.workspaceRoot, 'projects');
  if (project.rootAbsPath.startsWith(projectsRoot + path.sep)) {
    newRootAbsPath = path.join(projectsRoot, newProjectId);
    await fs.rename(project.rootAbsPath, newRootAbsPath);
  }

  const newProject: Project = { id: newProjectId, name: newName, rootAbsPath: newRootAbsPath };
  await fs.writeFile(path.join(projectStateDir, `${newProjectId}.json`), JSON.stringify(newProject));
  if (newProjectId !== projectId) {
    await fs.rm(metaPath);
  }

  return { project_id: newProjectId, name: newName, root: newRootAbsPath };
}

export async function listProjects(): Promise<Project[]> {
  try {
    const files = await fs.readdir(projectStateDir);
    const projects: Project[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(projectStateDir, file), 'utf-8');
        projects.push(JSON.parse(data));
      }
    }
    return projects;
  } catch {
    return [];
  }
}

export async function getProject(projectId: string): Promise<Project> {
  const file = path.join(projectStateDir, `${projectId}.json`);
  try {
    const data = await fs.readFile(file, 'utf-8');
    return JSON.parse(data);
  } catch {
    throw new Error('Project not found');
  }
}
