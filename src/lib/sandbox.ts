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
  return new Promise((resolve, reject) => {
    const start = Date.now();

    let shellCommand: string;
    let shellArgs: string[];

    if (process.platform === 'win32') {
      shellCommand = 'powershell.exe';
      shellArgs = ['-Command', command];
    } else {
      // Try to find available shells in order of preference
      const possibleShells = [
        '/bin/bash',
        '/usr/bin/bash', 
        '/bin/sh',
        '/usr/bin/sh',
        'bash',
        'sh'
      ];
      
      let foundShell = null;
      const fs = require('fs');
      
      console.log(`[spawnBash] Attempting to find compatible shell...`);
      
      // Try direct file system access first (more reliable)
      for (const shellPath of possibleShells) {
        try {
          console.log(`[spawnBash] Trying shell: ${shellPath}`);
          fs.accessSync(shellPath, fs.constants.F_OK | fs.constants.X_OK);
          if (shellPath.includes('bash')) {
            foundShell = { command: shellPath, args: ['-lc', command] };
          } else {
            foundShell = { command: shellPath, args: ['-c', command] };
          }
          console.log(`[spawnBash] Found shell at: ${shellPath}`);
          break;
        } catch (error: any) {
          console.log(`[spawnBash] Shell ${shellPath} not available: ${error.code}`);
          // Continue trying next shell
        }
      }
      
      // If direct access failed, try using 'which' command as fallback
      if (!foundShell) {
        console.log(`[spawnBash] Direct shell access failed, trying 'which' command...`);
        const which = (cmd: string) => {
          try {
            const result = require('child_process').execSync(`command -v ${cmd}`, { 
              stdio: ['ignore', 'pipe', 'ignore'],
              encoding: 'utf8'
            }).toString().trim();
            console.log(`[spawnBash] 'which ${cmd}' returned: ${result}`);
            return result || null;
          } catch (error: any) {
            console.log(`[spawnBash] 'which ${cmd}' failed: ${error.message}`);
            return null;
          }
        };
        
        const bashPath = which('bash');
        if (bashPath) {
          foundShell = { command: bashPath, args: ['-lc', command] };
          console.log(`[spawnBash] Found bash via which: ${bashPath}`);
        } else {
          const shPath = which('sh');
          if (shPath) {
            foundShell = { command: shPath, args: ['-c', command] };
            console.log(`[spawnBash] Found sh via which: ${shPath}`);
          }
        }
      }
      
      if (!foundShell) {
        const error = new Error(`No compatible shell found. Tried: ${possibleShells.join(', ')}`);
        console.error('[spawnBash] Shell detection failed:', error.message);
        reject(error);
        return;
      }
      
      shellCommand = foundShell.command;
      shellArgs = foundShell.args;
    }

    console.log(`[spawnBash] Executing: ${shellCommand} ${shellArgs.join(' ')}`);
    console.log(`[spawnBash] Working directory: ${opts.cwd}`);
    console.log(`[spawnBash] Command: ${command}`);

    let proc;
    try {
      proc = spawn(shellCommand, shellArgs, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        shell: false, // We explicitly specify the shellCommand, so we don't need Node.js to spawn another shell
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
    } catch (error: any) {
      console.error(`[spawnBash] Failed to spawn process: ${error.message}`);
      console.error(`[spawnBash] Shell command: ${shellCommand}`);
      console.error(`[spawnBash] Shell args: ${JSON.stringify(shellArgs)}`);
      reject(error);
      return;
    }

    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let killed = false;
    const maxOut = opts.maxStdoutBytes ?? config.maxStdoutBytes;
    const maxErr = opts.maxStderrBytes ?? config.maxStdoutBytes;
    
    proc.on('error', (error) => {
      console.error(`[spawnBash] Process error: ${error.message}`);
      console.error(`[spawnBash] Shell command: ${shellCommand}`);
      console.error(`[spawnBash] Shell args: ${JSON.stringify(shellArgs)}`);
      clearTimeout(timeout);
      reject(error);
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
