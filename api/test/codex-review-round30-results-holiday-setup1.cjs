module.exports = {
  "selected": [
    "codex-review-round30-holiday-scope"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 2,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 9849.8182
  },
  "results": [
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday update: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 5999.9752,
      "pass": false,
      "error": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "cause": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday cancel: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 1085.2289,
      "pass": false,
      "error": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "cause": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday scope controls: ordinary foreign write is refused; authorized branch still updates and cancels",
      "ms": 183.5467,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday update: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 5999.9752,
      "pass": false,
      "error": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "cause": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday cancel: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 1085.2289,
      "pass": false,
      "error": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "cause": "Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Real payroll creates the source for this branch-B holiday work\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"holiday-order-controls\",\"foreignUpdate\":404,\"foreignCancel\":404,\"authorizedUpdate\":200,\"authorizedCancel\":201}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9849.8182"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r30_holiday_scope_test_4e98ce9e39493e45\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r30_holiday_scope_test_4e98ce9e39493e45\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r30_holiday_scope_test_4e98ce9e39493e45\"}\n"
  ]
}
