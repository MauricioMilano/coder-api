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
  console.log(`[runBashCommand] Starting execution for project: ${projectId}`);
  console.log(`[runBashCommand] Request body:`, JSON.stringify(body, null, 2));
  
  const parse = BashSchema.safeParse(body);
  if (!parse.success) {
    console.error(`[runBashCommand] Validation failed:`, parse.error.errors);
    throw { statusCode: 422, message: "Validation error", details: parse.error.errors };
  }

  const { config } = require("../config");
  const stateFile = path.join(config.workspaceRoot, ".state", `${projectId}.json`);
  console.log(`[runBashCommand] Looking for project state file: ${stateFile}`);

  let project: Project;
  try {
    project = JSON.parse(await fs.readFile(stateFile, "utf-8"));
    console.log(`[runBashCommand] Project found: ${project.name} at ${project.rootAbsPath}`);
  } catch (error: any) {
    console.error(`[runBashCommand] Project not found: ${error.message}`);
    throw { statusCode: 404, message: "Project not found" };
  }

  // Clamp timeout to avoid resource exhaustion (1s..600s)
  const timeoutSec = Math.max(1, Math.min(parse.data.timeout_sec ?? config.bashTimeoutSec, 600));
  console.log(`[runBashCommand] Timeout set to: ${timeoutSec}s`);

  // Resolve workdir safely; convert path errors into 400 instead of 500
  let absWorkdir: string;
  try {
    absWorkdir = await safeResolvePath(project.rootAbsPath, parse.data.workdir);
    console.log(`[runBashCommand] Resolved working directory: ${absWorkdir}`);
  } catch (e: any) {
    console.error(`[runBashCommand] Invalid workdir: ${e?.message}`);
    throw { statusCode: 400, message: e?.message || "Invalid workdir" };
  }

  try {
    console.log(`[runBashCommand] Executing command: ${parse.data.command}`);
    const result = await spawnBash(parse.data.command, {
      cwd: absWorkdir,
      timeoutSec,
      env: parse.data.env,
    });
    console.log(`[runBashCommand] Command completed successfully with exit code: ${result.exit_code}`);
    return result;
  } catch (e: any) {
    console.error(`[runBashCommand] Command execution failed: ${e?.message}`);
    console.error(`[runBashCommand] Error details:`, e);
    // Defensive: spawnBash resolves even on kill, but guard in case of future throws
    throw { statusCode: 500, message: e?.message || "Failed to execute command" };
  }
}
