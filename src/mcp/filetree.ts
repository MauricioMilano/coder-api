import { listFiletree } from "../services/filetree";

export const filetreeMcp = {
  list: async (params: { project: any; path?: string; depth?: number; glob?: string; max_entries?: number }) => {
    return await listFiletree(params.project, params);
  },
};
