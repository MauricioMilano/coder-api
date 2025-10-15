import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { safeResolvePath } from "../lib/fs-safe";
import { spawnBash } from "../lib/sandbox";
import { Project } from "../types/common";

const BashSchema = z.object({
  command: z.string().min(1),
  workdir: z.string().default("/"),
  timeout_sec: z.number().default(120),
  env: z.record(z.string()).optional(),
});

export async function runBashCommand(projectId: string, body: any) {
  const parse = BashSchema.safeParse(body);
  if (!parse.success) {
    throw { statusCode: 422, message: "Validation error", details: parse.error.errors };
  }

  const { config } = require("../config");
  const stateFile = path.join(config.workspaceRoot, ".state", `${projectId}.json`);

  let project: Project;
  try {
    project = JSON.parse(await fs.readFile(stateFile, "utf-8"));
  } catch {
    throw { statusCode: 404, message: "Project not found" };
  }

  // Clamp timeout to avoid resource exhaustion (1s..600s)
  const timeoutSec = Math.max(1, Math.min(parse.data.timeout_sec ?? config.bashTimeoutSec, 600));

  // Resolve workdir safely; convert path errors into 400 instead of 500
  let absWorkdir: string;
  try {
    absWorkdir = await safeResolvePath(project.rootAbsPath, parse.data.workdir);
  } catch (e: any) {
    throw { statusCode: 400, message: e?.message || "Invalid workdir" };
  }

  try {
    const result = await spawnBash(parse.data.command, {
      cwd: absWorkdir,
      timeoutSec,
      env: parse.data.env,
    });
    return result;
  } catch (e: any) {
    // Defensive: spawnBash resolves even on kill, but guard in case of future throws
    throw { statusCode: 500, message: e?.message || "Failed to execute command" };
  }
}
