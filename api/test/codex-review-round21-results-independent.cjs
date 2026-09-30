module.exports = {
  "selected": [
    "codex-review-round21-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 4,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 6629.7299
  },
  "results": [
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 real payroll filtered totals and register equal the hand sum; excluded department and branch add nothing",
      "ms": 4341.1177,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 mark-filtered serializes two stale callers and writes exactly the filtered employees once",
      "ms": 0.5666,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 old request counts must not reveal the transferred requester department or team outside viewer scope",
      "ms": 0.0806,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 bank-sheet client filter and financial register use the same payroll snapshot after employee transfer",
      "ms": 0.045,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 real payroll filtered totals and register equal the hand sum; excluded department and branch add nothing",
      "ms": 4341.1177,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 mark-filtered serializes two stale callers and writes exactly the filtered employees once",
      "ms": 0.5666,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 old request counts must not reveal the transferred requester department or team outside viewer scope",
      "ms": 0.0806,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 bank-sheet client filter and financial register use the same payroll snapshot after employee transfer",
      "ms": 0.045,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:25:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 0",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6629.7299"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r21_independent_test_f35770f55af1713c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r21_independent_test_f35770f55af1713c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r21_independent_test_f35770f55af1713c\"}\n"
  ]
}
