module.exports = {
  "selected": [
    "codex-review-p2v-independent",
    "codex-review-p2v-rollover-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 3,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 7899.8074
  },
  "results": [
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V A settled return requires trimmed reason and preserves join date and balances",
      "ms": 5044.0348,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B old future-dated leave cancellation must not restore days from the new period",
      "ms": 203.1755,
      "pass": false,
      "error": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "cause": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Frozen old leave must not refund new-period deductions\n\n0 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:26:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B hidden old payroll period must not be returned to new-branch employee reader",
      "ms": 93.912,
      "pass": false,
      "error": "Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n",
      "cause": "Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:36:37)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B freeze failure rolls back employee, employment period and all balances atomically",
      "ms": 48.3134,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2v-rollover-race.integration.cjs",
      "name": "P2V B a year rollover already reading old balances must not import their carry into new service",
      "ms": 5020.0642,
      "pass": false,
      "error": "Old-service carry must not reach the current service balance\n\n10 !== 0\n",
      "cause": "Old-service carry must not reach the current service balance\n\n10 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Old-service carry must not reach the current service balance\n\n10 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-rollover-race.integration.cjs:21:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B old future-dated leave cancellation must not restore days from the new period",
      "ms": 203.1755,
      "pass": false,
      "error": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "cause": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Frozen old leave must not refund new-period deductions\n\n0 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:26:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2v-independent.integration.cjs",
      "name": "P2V B hidden old payroll period must not be returned to new-branch employee reader",
      "ms": 93.912,
      "pass": false,
      "error": "Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n",
      "cause": "Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-independent.integration.cjs:36:37)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2v-rollover-race.integration.cjs",
      "name": "P2V B a year rollover already reading old balances must not import their carry into new service",
      "ms": 5020.0642,
      "pass": false,
      "error": "Old-service carry must not reach the current service balance\n\n10 !== 0\n",
      "cause": "Old-service carry must not reach the current service balance\n\n10 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Old-service carry must not reach the current service balance\n\n10 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-rollover-race.integration.cjs:21:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"old-future-leave\",\"beforeTaken\":2,\"afterTaken\":0,\"frozenTaken\":3}",
    "{\"case\":\"hidden-payroll-period\",\"status\":200,\"visible\":false,\"response\":{\"ready\":true,\"periods\":[],\"current\":{\"periodNo\":1,\"startDate\":\"2020-01-01\"},\"rehire\":{\"available\":false,\"code\":\"REHIRE_PENDING_OLD_RUN\",\"blocked\":\"الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة (مسير شهر 2025-04) — اعتمده أو ألغيه قبل إعادة التعيين\",\"lastWorkingDay\":\"2025-06-30\",\"minStartDate\":null,\"maxStartDate\":\"2027-10-07\"}}}",
    "{\"case\":\"rollover-crosses-rehire\",\"oldPeriod\":\"2025\",\"newPeriod\":\"2026\",\"beforeOpening\":0,\"afterOpening\":10,\"frozen\":[{\"period\":\"P1:2025\",\"taken\":0,\"openingDays\":0}]}",
    "tests 5",
    "suites 0",
    "pass 2",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7899.8074"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2v_independent_test_c5ce7067ca719879\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2v_independent_test_c5ce7067ca719879\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2v_independent_test_c5ce7067ca719879\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2v_rollover_race_test_fefd44f5c16ec65b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2v_rollover_race_test_fefd44f5c16ec65b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2v_rollover_race_test_fefd44f5c16ec65b\"}\n"
  ]
}
