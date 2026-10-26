// Stable Task Scheduler entry point; no terminal window, no shell interpolation.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
const log = fs.openSync(path.join(root, 'data', 'sync.log'), 'a');
try {
  if (process.argv.includes('--check')) {
    fs.writeSync(log, 'Scheduler launcher check passed; no provider request.\n');
  } else {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'daily-sync.mjs')], { cwd: root, stdio: ['ignore', log, log], windowsHide: true, timeout: 38 * 60_000 });
    process.exitCode = result.status ?? 1;
  }
} finally { fs.closeSync(log); }
