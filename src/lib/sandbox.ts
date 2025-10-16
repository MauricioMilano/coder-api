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

    console.log(`[spawnBash] Starting command execution (execSync approach)`);
    console.log(`[spawnBash] Working directory: ${opts.cwd}`);
    console.log(`[spawnBash] Command: ${command}`);
    console.log(`[spawnBash] Platform: ${process.platform}`);
    
    // Since spawn is having issues with symlinks in BusyBox, use execSync directly
    // This is more reliable in container environments
    const { execSync } = require('child_process');
    
    // Platform-specific shell configuration
    let possibleShells: Array<{ path: string; args: string[] }>;
    
    if (process.platform === 'win32') {
      // Windows shells in order of preference
      possibleShells = [
        { path: 'powershell.exe', args: ['-Command'] },
        { path: 'pwsh.exe', args: ['-Command'] }, // PowerShell Core
        { path: 'cmd.exe', args: ['/c'] },
        { path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', args: ['-Command'] },
        { path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', args: ['-Command'] }
      ];
    } else {
      // Unix-like systems (Linux, macOS, etc.)
      possibleShells = [
        { path: '/bin/busybox', args: ['sh', '-c'] }, // Direct busybox call - most reliable
        { path: '/bin/ash', args: ['-c'] }, // BusyBox ash
        { path: '/bin/sh', args: ['-c'] },  // Symlink to busybox
        { path: '/bin/bash', args: ['-lc'] },
        { path: '/usr/bin/bash', args: ['-lc'] },
        { path: '/usr/bin/sh', args: ['-c'] }
      ];
    }
    
    // First, let's diagnose what's actually available
    console.log(`[spawnBash] === DIAGNOSTIC INFORMATION ===`);
    try {
      const fs = require('fs');
      console.log(`[spawnBash] Checking /bin directory:`);
      const binFiles = fs.readdirSync('/bin').filter((f: string) => f.includes('sh') || f === 'bash' || f === 'ash' || f === 'busybox');
      console.log(`[spawnBash] /bin shell files: ${binFiles.join(', ')}`);
      
      console.log(`[spawnBash] Checking /usr/bin directory:`);
      try {
        const usrBinFiles = fs.readdirSync('/usr/bin').filter((f: string) => f.includes('sh') || f === 'bash' || f === 'ash');
        console.log(`[spawnBash] /usr/bin shell files: ${usrBinFiles.join(', ')}`);
      } catch (e: any) {
        console.log(`[spawnBash] /usr/bin not accessible: ${e.message}`);
      }
      
      // Check specific files
      const checkFiles = ['/bin/sh', '/bin/bash', '/bin/ash', '/bin/busybox', '/usr/bin/bash'];
      for (const file of checkFiles) {
        try {
          const stat = fs.statSync(file);
          const isExecutable = !!(stat.mode & parseInt('111', 8));
          console.log(`[spawnBash] ${file}: exists, executable=${isExecutable}, size=${stat.size}`);
        } catch (e: any) {
          console.log(`[spawnBash] ${file}: ${e.code}`);
        }
      }
    } catch (e: any) {
      console.log(`[spawnBash] Diagnostic failed: ${e.message}`);
    }
    console.log(`[spawnBash] === END DIAGNOSTIC ===`);
    
    let workingShell = null;
    
    for (const shell of possibleShells) {
      try {
        console.log(`[spawnBash] Testing shell: ${shell.path}`);
        
        // First check if the file exists before trying execSync
        try {
          const fs = require('fs');
          fs.accessSync(shell.path, fs.constants.F_OK | fs.constants.X_OK);
          console.log(`[spawnBash] File exists and is executable: ${shell.path}`);
        } catch (fsError: any) {
          console.log(`[spawnBash] File access failed for ${shell.path}: ${fsError.code}`);
          continue;
        }
        
        // The issue might be that execSync can't handle complex shell paths
        // Let's try a simpler approach - use spawnSync instead
        console.log(`[spawnBash] Test command: ${shell.path} with args: ${JSON.stringify([...shell.args, 'echo test'])}`);
        
        const { spawnSync } = require('child_process');
        const result = spawnSync(shell.path, [...shell.args, 'echo test'], {
          stdio: ['ignore', 'ignore', 'ignore'],
          timeout: 2000,
          cwd: opts.cwd
        });
        
        if (result.error) {
          throw result.error;
        }
        
        if (result.status !== 0) {
          throw new Error(`Shell test failed with exit code ${result.status}`);
        }
        workingShell = shell;
        console.log(`[spawnBash] Found working shell: ${shell.path}`);
        break;
      } catch (error: any) {
        console.log(`[spawnBash] Shell ${shell.path} failed: ${error.code || error.message}`);
        continue;
      }
    }
    
    if (!workingShell) {
      const error = new Error(`No compatible shell found. Tried: ${possibleShells.map(s => s.path).join(', ')}`);
      console.error('[spawnBash] Shell detection failed:', error.message);
      reject(error);
      return;
    }
    
    console.log(`[spawnBash] Using execSync with shell: ${workingShell.path}`);
    
    // Use spawnSync instead of execSync since it handles executables more reliably
    try {
      const shellArgs = [...workingShell.args, command];
      console.log(`[spawnBash] Executing: ${workingShell.path} with args: ${JSON.stringify(shellArgs)}`);
      
      const timeoutMs = (opts.timeoutSec ?? config.bashTimeoutSec) * 1000;
      const maxOut = opts.maxStdoutBytes ?? config.maxStdoutBytes;
      const maxErr = opts.maxStderrBytes ?? config.maxStdoutBytes;
      
      const { spawnSync } = require('child_process');
      const result = spawnSync(workingShell.path, shellArgs, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        encoding: 'buffer',
        timeout: timeoutMs,
        maxBuffer: Math.max(maxOut, maxErr),
        killSignal: 'SIGKILL'
      });
      
      // Check for spawn errors
      if (result.error) {
        throw result.error;
      }
      
      const stdout = result.stdout ? result.stdout.slice(0, maxOut).toString('utf-8') : '';
      const stderr = result.stderr ? result.stderr.slice(0, maxErr).toString('utf-8') : '';
      const duration = Date.now() - start;
      
      console.log(`[spawnBash] Command completed, exit code: ${result.status}, duration: ${duration}ms`);
      
      resolve({
        exit_code: result.status,
        stdout: stdout,
        stderr: stderr,
        duration_ms: duration,
        truncated: {
          stdout: result.stdout ? result.stdout.length > maxOut : false,
          stderr: result.stderr ? result.stderr.length > maxErr : false
        }
      });
      
    } catch (error: any) {
      console.error(`[spawnBash] spawnSync failed: ${error.message}`);
      
      const duration = Date.now() - start;
      const maxOut = opts.maxStdoutBytes ?? config.maxStdoutBytes;
      const maxErr = opts.maxStderrBytes ?? config.maxStdoutBytes;
      
      // Handle spawnSync error with output
      const stdout = error.stdout ? error.stdout.slice(0, maxOut).toString('utf-8') : '';
      const stderr = error.stderr ? error.stderr.slice(0, maxErr).toString('utf-8') : error.message;
      const exitCode = error.status !== undefined ? error.status : (error.signal === 'SIGKILL' ? null : 1);
      
      console.log(`[spawnBash] Command failed with exit code: ${exitCode}, duration: ${duration}ms`);
      
      resolve({
        exit_code: exitCode,
        stdout: stdout,
        stderr: stderr,
        duration_ms: duration,
        truncated: {
          stdout: error.stdout ? error.stdout.length > maxOut : false,
          stderr: error.stderr ? error.stderr.length > maxErr : false
        }
      });
    }
  });
}
// Observação: para MVP, não há isolamento real de rede. Documentar no README.
