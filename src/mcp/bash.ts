import { runBashCommand } from "../services/bash";

export const bashMcp = {
  run: async (params: { project: any; command: string; workdir?: string; timeout_sec?: number; env?: Record<string, string> }) => {
    return await runBashCommand(params.project, params);
  },
};
