// Read-only unit suites: fake transports only, no application startup.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const names = ['codex-review-p7a-legacy', 'org-audience', 'holiday-audience', 'holiday-audience-exclusion', 'dashboard-cards', 'announcements-home', 'job-share', 'notification-channels'];
const r = cp.spawnSync(process.execPath, ['--test', ...names.map(n => path.join(__dirname, n + '.test.cjs'))], { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 120000, maxBuffer: 2e6 });
fs.writeFileSync(path.join(__dirname, 'codex-review-p7a-unit-evidence.cjs'), 'module.exports = ' + JSON.stringify({ names, status: r.status, stdout: r.stdout, stderr: r.stderr }, null, 2) + '\n');
console.log((r.stdout || '').split(/\r?\n/).slice(-12).join('\n'));
if (r.stderr) console.error(r.stderr);
process.exitCode = r.status ?? 1;
