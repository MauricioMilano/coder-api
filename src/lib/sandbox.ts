import { spawn } from 'child_process';
import { config } from '../config';

export async function spawnBash(command: string, opts: {
  cwd: string,
  timeoutSec?: number,
  env?: Record<string, string>,
  maxStdoutBytes?: number,
  maxStderrBytes?: number,
}): Promise<{
  exit_code: number | null,
  stdout: string,
  stderr: string,
  duration_ms: number,
  truncated: { stdout: boolean, stderr: boolean }
}> {
  return new Promise((resolve) => {
    const start = Date.now();

    let shellCommand: string;
    let shellArgs: string[];

    if (process.platform === 'win32') {
      shellCommand = 'powershell.exe';
      shellArgs = ['-Command', command];
    } else {
      const which = (cmd: string) => {
        try {
          return require('child_process').execSync(`command -v ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        } catch {
          return null;
        }
      };
      const bashPath = which('bash');
      if (bashPath) {
        shellCommand = bashPath;
        shellArgs = ['-lc', command];
      } else {
        shellCommand = 'sh';
        shellArgs = ['-c', command];
      }
    }

    const proc = spawn(shellCommand, shellArgs, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      shell: false, // We explicitly specify the shellCommand, so we don't need Node.js to spawn another shell
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let killed = false;
    const maxOut = opts.maxStdoutBytes ?? config.maxStdoutBytes;
    const maxErr = opts.maxStderrBytes ?? config.maxStdoutBytes;
    proc.stdout.on('data', (chunk) => {
      if (stdout.length < maxOut) stdout = Buffer.concat([stdout, chunk]);
      if (stdout.length > maxOut) proc.kill('SIGKILL');
    });
    proc.stderr.on('data', (chunk) => {
      if (stderr.length < maxErr) stderr = Buffer.concat([stderr, chunk]);
      if (stderr.length > maxErr) proc.kill('SIGKILL');
    });
    const timeout = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, (opts.timeoutSec ?? config.bashTimeoutSec) * 1000);
    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        exit_code: killed ? null : code,
        stdout: stdout.slice(0, maxOut).toString('utf-8'),
        stderr: stderr.slice(0, maxErr).toString('utf-8'),
        duration_ms: Date.now() - start,
        truncated: {
          stdout: stdout.length > maxOut,
          stderr: stderr.length > maxErr,
        },
      });
    });
  });
}
// Observação: para MVP, não há isolamento real de rede. Documentar no README.