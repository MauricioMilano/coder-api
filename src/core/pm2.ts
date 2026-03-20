import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

let cachedPm2Binary: string | null = null;
async function getPm2Binary(): Promise<string> {
  if (cachedPm2Binary) return cachedPm2Binary;
  if (process.env.PM2_BINARY) {
    cachedPm2Binary = process.env.PM2_BINARY;
    return cachedPm2Binary;
  }

  try {
    const { stdout } = await execAsync('which pm2');
    const candidate = stdout.toString().trim();
    if (candidate) {
      cachedPm2Binary = candidate;
      return candidate;
    }
  } catch (err) {
    // ignore and fallback
  }

  // Fallback to common global install location
  cachedPm2Binary = '/usr/local/bin/pm2';
  return cachedPm2Binary;
}

/**
 * Check if PM2 is installed and available
 */
export async function checkPM2Installation(): Promise<{ installed: boolean; error?: string; pm2Binary?: string }> {
  try {
    const pm2 = await getPm2Binary();
    await execAsync(`${pm2} --version`);
    return { installed: true, pm2Binary: pm2 };
  } catch (error: any) {
    return {
      installed: false,
      pm2Binary: cachedPm2Binary || undefined,
      error: 'PM2 is not installed or not available in PATH. Please ensure pm2 is installed globally: npm install -g pm2'
    };
  }
}

export interface PM2ProcessInfo {
  pid: number | null;
  name: string;
  pm2_env: {
    status: string;
    pm_id: number;
    restart_time: number;
    unstable_restarts: number;
    created_at: number | null;
    [key: string]: unknown;
  };
  monit: {
    memory: number;
    cpu: number;
  };
}

export interface PM2StartOptions {
  name?: string;
  script: string;
  cwd?: string; // working directory relative to current process if provided
  args?: string[];
  env?: Record<string, string>;
  instances?: number;
  watch?: boolean;
  ignore_watch?: string[];
  max_memory_restart?: string;
  log_file?: string;
  out_file?: string;
  error_file?: string;
  merge_logs?: boolean;
  time?: boolean;
}

export interface PM2CommandResult {
  [key: string]: unknown;
  success: boolean;
  output: string;
  error?: string;
  errorDetails?: string;
  pm2Binary?: string;
  processes?: PM2ProcessInfo[];
}

function resolveCwd(cwd?: string) {
  return cwd ? path.resolve(process.cwd(), cwd) : process.cwd();
}

/**
 * Start an application with PM2
 */
export async function startPM2App(options: PM2StartOptions): Promise<PM2CommandResult> {
  const pm2Check = await checkPM2Installation();
  if (!pm2Check.installed) {
    return {
      success: false,
      output: '',
      error: pm2Check.error,
      pm2Binary: pm2Check.pm2Binary
    };
  }

  try {
    const pm2 = await getPm2Binary();
    const cwd = resolveCwd(options.cwd);
    const args: string[] = ['start', options.script];

    if (options.name) {
      args.push('--name', options.name);
    }

    if (options.instances) {
      args.push('--instances', options.instances.toString());
    }

    if (options.watch) {
      args.push('--watch');
      if (options.ignore_watch && options.ignore_watch.length > 0) {
        args.push('--ignore-watch', options.ignore_watch.join(','));
      }
    }

    if (options.max_memory_restart) {
      args.push('--max-memory-restart', options.max_memory_restart);
    }

    if (options.log_file) {
      args.push('--log', path.resolve(cwd, options.log_file));
    }

    if (options.out_file) {
      args.push('--output', path.resolve(cwd, options.out_file));
    }

    if (options.error_file) {
      args.push('--error', path.resolve(cwd, options.error_file));
    }

    if (options.merge_logs) {
      args.push('--merge-logs');
    }

    if (options.time) {
      args.push('--time');
    }

    if (options.args && options.args.length > 0) {
      args.push('--', ...options.args);
    }

    const env = { ...process.env, ...options.env };
    const cmd = `${pm2} ${args.join(' ')}`;
    const { stdout, stderr } = await execAsync(cmd, { cwd, env });

    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to start PM2 application',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}

/**
 * Stop PM2 application(s)
 */
export async function stopPM2App(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const pm2 = await getPm2Binary();
    const cwdUsed = resolveCwd(cwd);
    const cmd = `${pm2} stop ${nameOrId}`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to stop PM2 application',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}

/**
 * Restart PM2 application(s)
 */
export async function restartPM2App(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const pm2 = await getPm2Binary();
    const cwdUsed = resolveCwd(cwd);
    const cmd = `${pm2} restart ${nameOrId}`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to restart PM2 application',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}

/**
 * Delete PM2 application(s)
 */
export async function deletePM2App(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const pm2 = await getPm2Binary();
    const cwdUsed = resolveCwd(cwd);
    const cmd = `${pm2} delete ${nameOrId}`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to delete PM2 application',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}

/**
 * List PM2 applications
 */
export async function listPM2Apps(cwd?: string): Promise<PM2CommandResult> {
  const pm2Check = await checkPM2Installation();
  if (!pm2Check.installed) {
    return {
      success: false,
      output: '',
      error: pm2Check.error,
      pm2Binary: pm2Check.pm2Binary
    };
  }

  try {
    const pm2 = await getPm2Binary();
    const cwdUsed = resolveCwd(cwd);
    const cmd = `${pm2} jlist`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: cwdUsed });
    let processes: PM2ProcessInfo[] = [];
    try {
      processes = JSON.parse(stdout);
    } catch (parseError) {
      // Return raw output if parsing failed
    }
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      processes,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to list PM2 applications',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}

/**
 * Get PM2 application status
 */
export async function getPM2AppStatus(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const pm2 = await getPm2Binary();
    const cwdUsed = resolveCwd(cwd);
    const cmd = `${pm2} show ${nameOrId}`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to get PM2 application status',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}

/**
 * Get PM2 application logs
 */
export async function getPM2AppLogs(nameOrId: string, lines: number = 100, cwd?: string): Promise<PM2CommandResult> {
  try {
    const pm2 = await getPm2Binary();
    const cwdUsed = resolveCwd(cwd);
    const cmd = `${pm2} logs ${nameOrId} --lines ${lines} --nostream`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to get PM2 application logs',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}

/**
 * Stop and delete all PM2 applications
 */
export async function stopAllPM2Apps(): Promise<PM2CommandResult> {
  try {
    const pm2 = await getPm2Binary();
    const cmd = `${pm2} kill`;
    const { stdout, stderr } = await execAsync(cmd);
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      pm2Binary: pm2
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to stop all PM2 applications',
      errorDetails: (error && (error.stderr || error.stack || String(error))) || undefined
    };
  }
}
