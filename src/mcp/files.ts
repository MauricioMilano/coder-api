import { readProjectFile, createProjectFile, editProjectFile, deleteProjectPath } from "../services/files";

export const filesMcp = {
  read: async (params: { project: any; path: string; encoding?: "text" | "base64" }) => {
    return await readProjectFile(params.project, params.path, params.encoding ?? "text");
  },
  create: async (params: { project: any; path: string; content: string; encoding?: "text" | "base64"; overwrite?: boolean }) => {
    return await createProjectFile(params.project, {
      path: params.path,
      content: params.content,
      encoding: params.encoding ?? "text",
      overwrite: params.overwrite ?? false,
    }, undefined, "MCP", "files.mcp.create");
  },
  edit: async (params: { project: any; path: string; content: string; expected_hash?: string }) => {
    return await editProjectFile(params.project, params);
  },
  delete: async (params: { project: any; path: string; recursive?: boolean; missing_ok?: boolean }) => {
    return await deleteProjectPath(params.project, {
      path: params.path,
      recursive: params.recursive ?? false,
      missing_ok: params.missing_ok ?? false,
    }, undefined, "MCP", "files.mcp.delete");
  },
};
