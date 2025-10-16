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

    console.log(`[spawnBash] Starting command execution`);
    console.log(`[spawnBash] Working directory: ${opts.cwd}`);
    console.log(`[spawnBash] Command: ${command}`);
    
    // Use Node.js built-in shell detection instead of manual detection
    // This is more reliable across different container environments
    let proc;
    try {
      console.log(`[spawnBash] Using Node.js built-in shell detection`);
      proc = spawn('sh', ['-c', command], {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        shell: true, // Let Node.js handle shell detection
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
      console.log(`[spawnBash] Process spawned successfully with shell=true`);
    } catch (error: any) {
      console.error(`[spawnBash] Failed to spawn process with shell=true: ${error.message}`);
      
      // Fallback: try manual shell detection
      console.log(`[spawnBash] Attempting manual shell detection as fallback...`);
      
      const possibleShells = [
        '/bin/bash',
        '/usr/bin/bash',
        '/bin/busybox',
        '/bin/sh', 
        '/usr/bin/sh',
        '/bin/ash',
        'bash',
        'sh',
        'busybox',
        'ash'
      ];
      
      let foundShell = null;
      const fs = require('fs');
      
      for (const shellPath of possibleShells) {
        try {
          console.log(`[spawnBash] Testing shell: ${shellPath}`);
          
          // Check if file exists
          fs.accessSync(shellPath, fs.constants.F_OK | fs.constants.X_OK);
          
          // Test with a simple spawn to see if it actually works
          const testProc = spawn(shellPath, ['-c', 'echo test'], {
            stdio: ['ignore', 'ignore', 'ignore'],
            timeout: 1000
          });
          
          // If we get here without throwing, the shell works
          testProc.kill();
          
          if (shellPath.includes('bash')) {
            foundShell = { command: shellPath, args: ['-lc', command] };
          } else if (shellPath.includes('busybox')) {
            foundShell = { command: shellPath, args: ['sh', '-c', command] };
          } else {
            foundShell = { command: shellPath, args: ['-c', command] };
          }
          
          console.log(`[spawnBash] Found working shell: ${shellPath}`);
          break;
        } catch (testError: any) {
          console.log(`[spawnBash] Shell ${shellPath} failed: ${testError.code || testError.message}`);
          continue;
        }
      }
      
      if (!foundShell) {
        const finalError = new Error(`No compatible shell found. Original error: ${error.message}. Tried: ${possibleShells.join(', ')}`);
        console.error('[spawnBash] All shell detection methods failed:', finalError.message);
        reject(finalError);
        return;
      }
      
      // Try with the found shell
      try {
        console.log(`[spawnBash] Attempting spawn with found shell: ${foundShell.command} ${foundShell.args.join(' ')}`);
        proc = spawn(foundShell.command, foundShell.args, {
          cwd: opts.cwd,
          env: { ...process.env, ...opts.env },
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        });
      } catch (finalError: any) {
        console.error(`[spawnBash] Final spawn attempt failed: ${finalError.message}`);
        reject(finalError);
        return;
      }
    }



    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let killed = false;
    const maxOut = opts.maxStdoutBytes ?? config.maxStdoutBytes;
    const maxErr = opts.maxStderrBytes ?? config.maxStdoutBytes;
    
    proc.on('error', (error) => {
      console.error(`[spawnBash] Process error: ${error.message}`);
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
