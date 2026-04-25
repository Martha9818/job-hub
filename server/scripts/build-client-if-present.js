const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

if (process.env.SKIP_CLIENT_BUILD === 'true') {
  console.log('[postinstall] SKIP_CLIENT_BUILD=true, skipping client build');
  process.exit(0);
}

const clientDir = path.resolve(__dirname, '..', '..', 'client');
const clientPackage = path.join(clientDir, 'package.json');

if (!fs.existsSync(clientPackage)) {
  console.log('[postinstall] client package not found, skipping client build');
  process.exit(0);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: clientDir,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`[postinstall] failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('[postinstall] building React client for integrated Express deployment');
if (process.platform === 'win32') {
  const shell = process.env.ComSpec || 'cmd.exe';
  run(shell, ['/d', '/s', '/c', 'npm install']);
  run(shell, ['/d', '/s', '/c', 'npm run build']);
} else {
  run('npm', ['install']);
  run('npm', ['run', 'build']);
}
