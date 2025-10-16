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
    
    // Find a working shell using execSync first, then use spawn with that shell
    let shellCommand: string;
    let shellArgs: string[];
    
    const { execSync } = require('child_process');
    const fs = require('fs');
    
    // Test shells in order of preference using execSync (which works better in containers)
    // Based on container analysis, prioritize the actual busybox executable over symlinks
    const possibleShells = [
      { path: '/bin/busybox', args: ['sh', '-c'] }, // Direct busybox call - most reliable
      { path: '/bin/bash', args: ['-lc'] },
      { path: '/usr/bin/bash', args: ['-lc'] },
      { path: '/bin/ash', args: ['-c'] }, // BusyBox ash
      { path: '/bin/sh', args: ['-c'] },  // Symlink to busybox, try after direct call
      { path: '/usr/bin/sh', args: ['-c'] }
    ];
    
    let foundShell = null;
    
    for (const shell of possibleShells) {
      try {
        console.log(`[spawnBash] Testing shell: ${shell.path}`);
        
        // Test with execSync first - this works more reliably in containers
        const testCommand = shell.args.join(' ') + ' "echo test"';
        console.log(`[spawnBash] execSync test command: ${shell.path} ${testCommand}`);
        execSync(`${shell.path} ${testCommand}`, { 
          stdio: ['ignore', 'ignore', 'ignore'],
          timeout: 2000
        });
        console.log(`[spawnBash] execSync test passed for: ${shell.path}`);
        
        // Now test with Node.js spawn to ensure it actually works
        console.log(`[spawnBash] Testing spawn with: ${shell.path} ${JSON.stringify([...shell.args, 'echo spawn_test'])}`);
        try {
          const testProc = spawn(shell.path, [...shell.args, 'echo spawn_test'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: opts.cwd,
            env: { ...process.env, ...opts.env }
          });
          
          // If we reach here, spawn didn't immediately fail
          console.log(`[spawnBash] spawn test process created successfully for: ${shell.path}`);
          testProc.kill(); // Clean up test process
          
          foundShell = shell;
          console.log(`[spawnBash] Found working shell (both execSync and spawn): ${shell.path}`);
          break;
        } catch (spawnError: any) {
          console.log(`[spawnBash] spawn test ERROR for ${shell.path}: ${spawnError.message}`);
          continue;
        }
        
      } catch (error: any) {
        console.log(`[spawnBash] Shell ${shell.path} failed execSync test: ${error.code || error.message}`);
        continue;
      }
    }
    
    if (!foundShell) {
      const error = new Error(`No compatible shell found. Tried: ${possibleShells.map(s => s.path).join(', ')}`);
      console.error('[spawnBash] Shell detection failed:', error.message);
      reject(error);
      return;
    }
    
    shellCommand = foundShell.path;
    shellArgs = [...foundShell.args, command];
    
    console.log(`[spawnBash] Using shell: ${shellCommand} with args: ${JSON.stringify(shellArgs)}`);
    
    let proc;
    try {
      proc = spawn(shellCommand, shellArgs, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        shell: false, // We handle shell detection manually
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
      console.log(`[spawnBash] Process spawned successfully`);
    } catch (error: any) {
      console.error(`[spawnBash] Failed to spawn process: ${error.message}`);
      console.error(`[spawnBash] Shell: ${shellCommand}, Args: ${JSON.stringify(shellArgs)}`);
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
