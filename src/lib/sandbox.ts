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
        
        let testCommand: string;
        if (process.platform === 'win32') {
          // Windows: Handle PowerShell and cmd properly
          if (shell.path.toLowerCase().includes('powershell') || shell.path.toLowerCase().includes('pwsh')) {
            testCommand = `${shell.path} ${shell.args.join(' ')} 'echo test'`;
          } else {
            testCommand = `${shell.path} ${shell.args.join(' ')} "echo test"`;
          }
        } else {
          // Unix: Use double quotes
          testCommand = `${shell.path} ${shell.args.join(' ')} "echo test"`;
        }
        
        console.log(`[spawnBash] Test command: ${testCommand}`);
        execSync(testCommand, { 
          stdio: ['ignore', 'ignore', 'ignore'],
          timeout: 2000,
          cwd: opts.cwd
        });
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
    
    // Use execSync instead of spawn since it works reliably
    try {
      let fullCommand: string;
      
      if (process.platform === 'win32') {
        // Windows: Handle PowerShell and cmd properly
        if (workingShell.path.toLowerCase().includes('powershell') || workingShell.path.toLowerCase().includes('pwsh')) {
          // PowerShell: Use single quotes and escape properly
          const escapedCommand = command.replace(/'/g, "''");
          fullCommand = `${workingShell.path} ${workingShell.args.join(' ')} '${escapedCommand}'`;
        } else {
          // CMD: Use double quotes and escape
          const escapedCommand = command.replace(/"/g, '""');
          fullCommand = `${workingShell.path} ${workingShell.args.join(' ')} "${escapedCommand}"`;
        }
      } else {
        // Unix: Use double quotes and escape
        const escapedCommand = command.replace(/"/g, '\\"');
        fullCommand = `${workingShell.path} ${workingShell.args.join(' ')} "${escapedCommand}"`;
      }
      
      console.log(`[spawnBash] Executing: ${fullCommand}`);
      
      const timeoutMs = (opts.timeoutSec ?? config.bashTimeoutSec) * 1000;
      const maxOut = opts.maxStdoutBytes ?? config.maxStdoutBytes;
      const maxErr = opts.maxStderrBytes ?? config.maxStdoutBytes;
      
      const result = execSync(fullCommand, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        encoding: 'buffer',
        timeout: timeoutMs,
        maxBuffer: Math.max(maxOut, maxErr),
        killSignal: 'SIGKILL'
      });
      
      const stdout = result.slice(0, maxOut).toString('utf-8');
      const duration = Date.now() - start;
      
      console.log(`[spawnBash] Command completed successfully, duration: ${duration}ms`);
      
      resolve({
        exit_code: 0,
        stdout: stdout,
        stderr: '',
        duration_ms: duration,
        truncated: {
          stdout: result.length > maxOut,
          stderr: false
        }
      });
      
    } catch (error: any) {
      console.error(`[spawnBash] execSync failed: ${error.message}`);
      
      const duration = Date.now() - start;
      const maxOut = opts.maxStdoutBytes ?? config.maxStdoutBytes;
      const maxErr = opts.maxStderrBytes ?? config.maxStdoutBytes;
      
      // Handle execSync error with output
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
