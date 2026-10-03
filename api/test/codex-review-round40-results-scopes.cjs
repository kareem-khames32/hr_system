module.exports = {
  "selected": [
    "codex-review-round40-scope-controls"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 10127.9772
  },
  "results": [
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 TEAM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 5934.5442,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 CUSTOM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 1769.276,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 12.3023,
      "pass": false,
      "error": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-scope-controls.integration.cjs:17:12)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 12.3023,
      "pass": false,
      "error": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-scope-controls.integration.cjs:17:12)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"TEAM\",\"branchLabel\":\"فريق: CR40 allowed team، وغيرها خارج نطاق صلاحيتك\",\"companyLabel\":\"فريق: CR40 allowed team، CR40 private team\",\"multiLabel\":\"فريق: CR40 allowed team، CR40 private team\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[null,null],\"storedUnchanged\":true}",
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"CUSTOM\",\"branchLabel\":\"قائمة مخصّصة\",\"companyLabel\":\"قائمة مخصّصة (2 موظف)\",\"multiLabel\":\"قائمة مخصّصة\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[2,\"فرع باء المحجوب\"],\"storedUnchanged\":true}",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10127.9772"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_scopes_test_8b059cae9ce34feb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_scopes_test_8b059cae9ce34feb\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_scopes_test_8b059cae9ce34feb\"}\n"
  ]
}
