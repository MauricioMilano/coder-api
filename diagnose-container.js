#!/usr/bin/env node

// Diagnostic script to understand the container environment
const { execSync, spawn } = require('child_process');
const fs = require('fs');

console.log('=== Container Shell Environment Diagnostics ===\n');

console.log('1. Basic environment info:');
console.log(`Platform: ${process.platform}`);
console.log(`Node version: ${process.version}`);
console.log(`PWD: ${process.cwd()}`);
console.log(`SHELL: ${process.env.SHELL || 'not set'}`);
console.log(`PATH: ${process.env.PATH}\n`);

console.log('2. File system check:');
const paths = ['/bin', '/usr/bin', '/bin/sh', '/bin/bash', '/bin/busybox', '/bin/ash'];
for (const p of paths) {
  try {
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      console.log(`✓ ${p} - file, executable: ${!!(stat.mode & parseInt('111', 8))}`);
    } else if (stat.isDirectory()) {
      console.log(`📁 ${p} - directory`);
      try {
        const files = fs.readdirSync(p).filter(f => f.includes('sh') || f === 'bash' || f === 'ash' || f === 'busybox');
        console.log(`   Contains: ${files.join(', ')}`);
      } catch {}
    } else if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(p);
      console.log(`🔗 ${p} -> ${target}`);
    }
  } catch (error) {
    console.log(`✗ ${p} - ${error.code}`);
  }
}

console.log('\n3. execSync tests:');
const testShells = [
  { path: '/bin/bash', args: ['-c'] },
  { path: '/bin/sh', args: ['-c'] },
  { path: '/bin/busybox', args: ['sh', '-c'] },
  { path: '/bin/ash', args: ['-c'] }
];

for (const shell of testShells) {
  try {
    const cmd = `${shell.path} ${shell.args.join(' ')} "echo hello"`;
    console.log(`Testing: ${cmd}`);
    const result = execSync(cmd, { encoding: 'utf8', timeout: 1000 });
    console.log(`✓ Success: ${result.trim()}`);
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
  }
}

console.log('\n4. spawn tests:');
for (const shell of testShells) {
  try {
    console.log(`Testing spawn: ${shell.path} ${JSON.stringify(shell.args)}`);
    const proc = spawn(shell.path, [...shell.args, 'echo hello'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      console.log(`✓ spawn success: ${output.trim()} (exit code: ${code})`);
    });
    
    proc.on('error', (error) => {
      console.log(`✗ spawn failed: ${error.message}`);
    });
    
    // Give it a moment
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.log(`✗ spawn exception: ${error.message}`);
  }
}

console.log('\n=== End Diagnostics ===');