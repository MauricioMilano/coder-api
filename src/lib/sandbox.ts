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

    console.log(`[spawnBash] Starting command execution (simple approach)`);
    console.log(`[spawnBash] Working directory: ${opts.cwd}`);
    console.log(`[spawnBash] Command: ${command}`);
    console.log(`[spawnBash] Platform: ${process.platform}`);

    let shellCommand: string = 'sh'; // Default fallback
    let shellArgs: string[] = ['-c', command]; // Default fallback

    if (process.platform === 'win32') {
      shellCommand = 'powershell.exe';
      shellArgs = ['-Command', command];
    } else {
      const fs = require('fs');
      function isExecutable(file: string) {
        try {
          fs.accessSync(file, fs.constants.X_OK);
          return fs.statSync(file).isFile();
        } catch {
          return false;
        }
      }
      console.log(`[spawnBash] Detecting available shell...`);
      // Always prefer /bin/bash if available
      // Always quote the command for shells to avoid syntax errors with special characters
      const quotedCommand = `'${command.replace(/'/g, `'"'"'`)}'`;
      if (isExecutable('/bin/bash')) {
        console.log(`[spawnBash] Using /bin/bash`);
        shellCommand = '/bin/bash';
        shellArgs = ['-lc', quotedCommand];
      } else if (isExecutable('/usr/bin/bash')) {
        console.log(`[spawnBash] Using /usr/bin/bash`);
        shellCommand = '/usr/bin/bash';
        shellArgs = ['-lc', quotedCommand];
      } else if (isExecutable('/bin/sh')) {
        console.log(`[spawnBash] Using /bin/sh`);
        shellCommand = '/bin/sh';
        shellArgs = ['-c', quotedCommand];
      } else if (isExecutable('/usr/bin/sh')) {
        console.log(`[spawnBash] Using /usr/bin/sh`);
        shellCommand = '/usr/bin/sh';
        shellArgs = ['-c', quotedCommand];
      } else if (isExecutable('/bin/ash')) {
        console.log(`[spawnBash] Using /bin/ash`);
        shellCommand = '/bin/ash';
        shellArgs = ['-c', quotedCommand];
      } else if (isExecutable('/usr/bin/ash')) {
        console.log(`[spawnBash] Using /usr/bin/ash`);
        shellCommand = '/usr/bin/ash';
        shellArgs = ['-c', quotedCommand];
      } else {
        console.log(`[spawnBash] No shell found, falling back to 'sh'`);
        shellCommand = 'sh';
        shellArgs = ['-c', quotedCommand];
      }
    }

    console.log(`[spawnBash] Using shell: ${shellCommand} with args: ${JSON.stringify(shellArgs)}`);

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
    
    proc.on('error', (error) => {
      console.error(`[spawnBash] Process error: ${error.message}`);
      clearTimeout(timeout);
      resolve({
        exit_code: 1,
        stdout: '',
        stderr: error.message,
        duration_ms: Date.now() - start,
        truncated: { stdout: false, stderr: false }
      });
    });
    
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
      console.log(`[spawnBash] Command timed out after ${opts.timeoutSec ?? config.bashTimeoutSec}s, killing process`);
      proc.kill('SIGKILL');
    }, (opts.timeoutSec ?? config.bashTimeoutSec) * 1000);
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      console.log(`[spawnBash] Process completed with exit code: ${killed ? 'KILLED' : code}, duration: ${Date.now() - start}ms`);
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
