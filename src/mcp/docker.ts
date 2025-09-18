import { runProjectDockerfile, getProjectDockerStatus, stopProjectDocker } from "../services/docker";

export const dockerMcp = {
  run: async (params: { project: any; dockerfilePath?: string; imageName?: string; containerName?: string; version?: string; buildArgs?: Record<string, string>; runArgs?: string[] }) => {
    return await runProjectDockerfile(params.project, params);
  },
  status: async (params: { project: any; containerName?: string }) => {
    return await getProjectDockerStatus(params.project, params.containerName);
  },
  stop: async (params: { project: any; containerName?: string }) => {
    return await stopProjectDocker(params.project, params.containerName);
  },
};
