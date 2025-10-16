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
      // Enhanced shell detection for containers
      const which = (cmd: string) => {
        try {
          return require('child_process').execSync(`command -v ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        } catch {
          return null;
        }
      };
      
      console.log(`[spawnBash] Detecting available shell...`);
      
      // Try different shells in order of preference
      const bashPath = which('bash');
      if (bashPath) {
        console.log(`[spawnBash] Found bash at: ${bashPath}`);
        shellCommand = bashPath;
        shellArgs = ['-lc', command];
      } else {
        // Fallback to sh (should work in Alpine/BusyBox)
        const shPath = which('sh');
        if (shPath) {
          console.log(`[spawnBash] Found sh at: ${shPath}`);
          shellCommand = shPath;
          shellArgs = ['-c', command];
        } else {
          // Last resort - try direct paths
          console.log(`[spawnBash] Command 'which' failed, trying direct paths...`);
          const fs = require('fs');
          const possiblePaths = ['/bin/bash', '/usr/bin/bash', '/bin/sh', '/usr/bin/sh', '/bin/ash'];
          
          let found = false;
          for (const path of possiblePaths) {
            try {
              fs.accessSync(path, fs.constants.F_OK | fs.constants.X_OK);
              console.log(`[spawnBash] Found shell at: ${path}`);
              shellCommand = path;
              shellArgs = path.includes('bash') ? ['-lc', command] : ['-c', command];
              found = true;
              break;
            } catch {
              // Continue trying
            }
          }
          
          if (!found) {
            console.log(`[spawnBash] No shell found, falling back to 'sh'`);
            shellCommand = 'sh';
            shellArgs = ['-c', command];
          }
        }
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
