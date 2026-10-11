// Read-only differential checks against the approved baseline. No application or DB is started.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ts = require('../node_modules/typescript');
require('../node_modules/ts-node').register({ project: path.join(root, 'api/tsconfig.json'), transpileOnly: true });
require('../node_modules/reflect-metadata');
function old(file) {
  const source = execFileSync('git', ['show', '36a8a648:' + file], { cwd: root, encoding: 'utf8', maxBuffer: 2e6 });
  const filename = path.join(root, file), m = new Module(filename, module);
  m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename));
  m._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText, filename);
  return m.exports;
}
test('P7B-L01: old request audience decisions and normalization remain identical', t => {
  const current = require('../src/requests/request-audience'), previous = old('api/src/requests/request-audience.ts');
  let checks = 0;
  const ids = [[], [1], [2], [1, 2], ['1', '2'], [99999]];
  for (const mode of ['all', 'employees', 'departments', 'roles', 'positions']) for (const selected of ids)
    for (const whereMode of ['company', 'branches', 'departments', 'teams']) for (const selectedWhere of ids) {
      const a = { mode, ids: selected, where: { mode: whereMode, ids: selectedWhere } }, text = JSON.stringify(a);
      assert.deepEqual(current.audienceWhereOf(a), previous.audienceWhereOf(a));
      for (const role of ['employee', 'hr_manager', 'super_admin']) for (const employeeId of [null, 1, 2]) for (const purpose of ['catalog', 'submit']) {
        const subject = { role, permissions: [], employeeId, departmentId: 1, teamId: 2, branchId: 1, departmentPath: [1, 77] };
        assert.equal(current.requestAudienceAllows(text, subject, purpose), previous.requestAudienceAllows(text, subject, purpose)); checks++;
      }
    }
  t.diagnostic(JSON.stringify({ case: 'P7B-L01', decisionComparisons: checks }));
});
test('P7B-L02: old holiday saved text, descriptions and valid employee decisions remain identical', t => {
  const current = require('../src/attendance/holiday-audience'), previous = old('api/src/attendance/holiday-audience.ts');
  const inputs = [null, { level: 'company' }, { level: 'branch', branchId: 1 }, { level: 'departments', branchId: 1, departmentIds: [3, 1] },
    { level: 'teams', branchId: 1, teamIds: [1, 2] }, { level: 'employees', branchId: 1, employeeIds: [3, 1] }];
  let checks = 0;
  for (const input of inputs) {
    const a = current.holidayAudienceFromInput(input), b = previous.holidayAudienceFromInput(input);
    assert.deepEqual(a, b); assert.equal(current.holidayAudienceColumn(a), previous.holidayAudienceColumn(b));
    assert.equal(current.describeHolidayAudience(a), previous.describeHolidayAudience(b));
    for (const employeeId of [1, 2, 3]) for (const branchId of [null, 1, 2]) for (const teamId of [null, 1, 2]) for (const departmentPath of [[], [1], [3, 1], [7]]) {
      const member = { employeeId, branchId, teamId, departmentPath };
      assert.equal(current.holidayAudienceMatches(a, member), previous.holidayAudienceMatches(b, member)); checks++;
    }
    assert.equal(current.holidayAudienceMatches(a, { employeeId: null, branchId: 1, teamId: null, departmentPath: [] }), previous.holidayAudienceMatches(b, { employeeId: null, branchId: 1, teamId: null, departmentPath: [] }));
  }
  t.diagnostic(JSON.stringify({ case: 'P7B-L02', decisionComparisons: checks }));
});
