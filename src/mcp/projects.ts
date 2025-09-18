import { createProject, editProjectName, listProjects, getProject } from "../services/projects";

export const projectsMcp = {
  create: async (params: { source: any; name: string }) => {
    return await createProject(params.source, params.name, undefined, "MCP", "projects.mcp.create");
  },
  editName: async (params: { projectId: string; newName: string }) => {
    return await editProjectName(params.projectId, params.newName);
  },
  list: async () => {
    return await listProjects();
  },
  get: async (params: { projectId: string }) => {
    return await getProject(params.projectId);
  },
};
