module.exports = {
  "selected": [
    "codex-review-p2v-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 7392.5246
  },
  "results": [
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V A settled return requires trimmed reason and preserves join date and balances",
      "ms": 4691.7961,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B old future-dated leave cancellation must not restore days from the new period",
      "ms": 183.3636,
      "pass": false,
      "error": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "cause": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Frozen old leave must not refund new-period deductions\n\n0 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:26:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B hidden old payroll period must not be returned to new-branch employee reader",
      "ms": 34.9102,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'filter')",
      "cause": "Cannot read properties of undefined (reading 'filter')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'filter')\n    at Object.payrollRunRefVisibility (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\src\\payroll\\payroll-run-visibility.ts:116:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:32:72)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B freeze failure rolls back employee, employment period and all balances atomically",
      "ms": 82.59,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B old future-dated leave cancellation must not restore days from the new period",
      "ms": 183.3636,
      "pass": false,
      "error": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "cause": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Frozen old leave must not refund new-period deductions\n\n0 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:26:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B hidden old payroll period must not be returned to new-branch employee reader",
      "ms": 34.9102,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'filter')",
      "cause": "Cannot read properties of undefined (reading 'filter')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'filter')\n    at Object.payrollRunRefVisibility (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\src\\payroll\\payroll-run-visibility.ts:116:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:32:72)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"old-future-leave\",\"beforeTaken\":2,\"afterTaken\":0,\"frozenTaken\":3}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7392.5246"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2v_independent_test_7242a156e712fc73\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2v_independent_test_7242a156e712fc73\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2v_independent_test_7242a156e712fc73\"}\n"
  ]
}
