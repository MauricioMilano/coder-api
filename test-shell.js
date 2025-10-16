const { spawn } = require('child_process');

function testShell(shell, args, label) {
  const proc = spawn(shell, args);
  let output = '';
  let error = '';
  proc.stdout.on('data', data => output += data);
  proc.stderr.on('data', data => error += data);
  proc.on('close', code => {
    console.log(`--- ${label} ---`);
    console.log(`Exit code: ${code}`);
    if (output) console.log(`STDOUT: ${output.trim()}`);
    if (error) console.log(`STDERR: ${error.trim()}`);
    console.log('');
  });
}

testShell('/bin/bash', ['-c', 'echo Bash works'], 'Test /bin/bash');
testShell('/bin/ash', ['-c', 'echo Ash works'], 'Test /bin/ash');
testShell('/bin/sh', ['-c', 'echo Sh works'], 'Test /bin/sh');
testShell('/usr/bin/bash', ['-c', 'echo Bash (usr) works'], 'Test /usr/bin/bash');
testShell('/usr/bin/ash', ['-c', 'echo Ash (usr) works'], 'Test /usr/bin/ash');
testShell('/usr/bin/sh', ['-c', 'echo Sh (usr) works'], 'Test /usr/bin/sh');
