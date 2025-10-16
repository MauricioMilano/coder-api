#!/usr/bin/env node

// Runtime shell diagnostics for container environments
const { execSync, spawn } = require('child_process');
const fs = require('fs');

console.log('=== Container Shell Environment Diagnostics ===\n');

console.log('1. Basic environment info:');
console.log(`Platform: ${process.platform}`);
console.log(`Node version: ${process.version}`);
console.log(`PWD: ${process.cwd()}`);
console.log(`SHELL: ${process.env.SHELL || 'not set'}`);
console.log(`PATH: ${process.env.PATH}\n`);

console.log('2. Checking for shell executables:');
const shellPaths = [
  '/bin/sh', '/bin/bash', '/bin/ash', '/bin/dash', '/bin/zsh',
  '/usr/bin/sh', '/usr/bin/bash', '/usr/bin/ash',
  '/bin/busybox'
];

shellPaths.forEach(path => {
  try {
    const stat = fs.statSync(path);
    if (stat.isFile()) {
      const executable = !!(stat.mode & parseInt('111', 8));
      console.log(`✓ ${path} - file, executable: ${executable}`);
      
      // Check if it's a symlink
      try {
        const realPath = fs.realpathSync(path);
        if (realPath !== path) {
          console.log(`  └─ symlink to: ${realPath}`);
        }
      } catch {}
    } else if (stat.isSymbolicLink()) {
      try {
        const target = fs.readlinkSync(path);
        console.log(`🔗 ${path} -> ${target}`);
      } catch {
        console.log(`🔗 ${path} -> (broken symlink)`);
      }
    }
  } catch (error) {
    console.log(`✗ ${path} - ${error.code}`);
  }
});

console.log('\n3. Testing with execSync:');
const testShells = [
  { path: '/bin/bash', args: ['-c'] },
  { path: '/bin/ash', args: ['-c'] },
  { path: '/bin/sh', args: ['-c'] },
  { path: '/bin/busybox', args: ['sh', '-c'] }
];

for (const shell of testShells) {
  try {
    const cmd = `${shell.path} ${shell.args.join(' ')} "echo 'Hello from ${shell.path}'"`;
    console.log(`Testing: ${cmd}`);
    const result = execSync(cmd, { encoding: 'utf8', timeout: 2000 });
    console.log(`✓ Success: ${result.trim()}`);
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
  }
}

console.log('\n4. Testing with spawn (async):');
async function testSpawn() {
  for (const shell of testShells) {
    try {
      console.log(`Testing spawn: ${shell.path} ${JSON.stringify([...shell.args, 'echo spawn test'])}`);
      
      const proc = spawn(shell.path, [...shell.args, 'echo spawn test'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let error = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      const exitCode = await new Promise((resolve) => {
        proc.on('close', resolve);
        proc.on('error', (err) => {
          console.log(`✗ spawn error: ${err.message}`);
          resolve(-1);
        });
        
        // Timeout after 2 seconds
        setTimeout(() => {
          proc.kill();
          resolve(-2);
        }, 2000);
      });
      
      if (exitCode === 0) {
        console.log(`✓ spawn success: ${output.trim()}`);
      } else {
        console.log(`✗ spawn failed: exit code ${exitCode}, error: ${error}`);
      }
      
    } catch (error) {
      console.log(`✗ spawn exception: ${error.message}`);
    }
  }
}

testSpawn().then(() => {
  console.log('\n=== End Diagnostics ===');
}).catch(console.error);