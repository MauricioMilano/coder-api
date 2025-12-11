import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Check if PM2 is installed and available
 */
export async function checkPM2Installation(): Promise<{ installed: boolean; error?: string }> {
  try {
    await execAsync('pm2 --version');
    return { installed: true };
  } catch (error: any) {
    return {
      installed: false,
      error: 'PM2 is not installed. Please install PM2 globally: npm install -g pm2'
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
    created_at: number;
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
      error: pm2Check.error
    };
  }

  try {
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
    const { stdout, stderr } = await execAsync(`pm2 ${args.join(' ')}`, { cwd, env });

    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to start PM2 application'
    };
  }
}

/**
 * Stop PM2 application(s)
 */
export async function stopPM2App(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const cwdUsed = resolveCwd(cwd);
    const { stdout, stderr } = await execAsync(`pm2 stop ${nameOrId}`, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to stop PM2 application'
    };
  }
}

/**
 * Restart PM2 application(s)
 */
export async function restartPM2App(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const cwdUsed = resolveCwd(cwd);
    const { stdout, stderr } = await execAsync(`pm2 restart ${nameOrId}`, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to restart PM2 application'
    };
  }
}

/**
 * Delete PM2 application(s)
 */
export async function deletePM2App(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const cwdUsed = resolveCwd(cwd);
    const { stdout, stderr } = await execAsync(`pm2 delete ${nameOrId}`, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to delete PM2 application'
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
      error: pm2Check.error
    };
  }

  try {
    const cwdUsed = resolveCwd(cwd);
    const { stdout, stderr } = await execAsync('pm2 jlist', { cwd: cwdUsed });
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
      processes
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to list PM2 applications'
    };
  }
}

/**
 * Get PM2 application status
 */
export async function getPM2AppStatus(nameOrId: string, cwd?: string): Promise<PM2CommandResult> {
  try {
    const cwdUsed = resolveCwd(cwd);
    const { stdout, stderr } = await execAsync(`pm2 show ${nameOrId}`, { cwd: cwdUsed });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to get PM2 application status'
    };
  }
}

/**
 * Get PM2 application logs
 */
export async function getPM2AppLogs(nameOrId: string, lines: number = 100, cwd?: string): Promise<PM2CommandResult> {
  try {
    const cwdUsed = resolveCwd(cwd);
    const { stdout, stderr } = await execAsync(`pm2 logs ${nameOrId} --lines ${lines} --nostream`, {
      cwd: cwdUsed
    });
    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to get PM2 application logs'
    };
  }
}

/**
 * Stop and delete all PM2 applications
 */
export async function stopAllPM2Apps(): Promise<PM2CommandResult> {
  try {
    const { stdout, stderr } = await execAsync('pm2 kill');
    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to stop all PM2 applications'
    };
  }
}
