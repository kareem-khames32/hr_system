module.exports = {
  "selected": [
    "codex-review-round36-ledger"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 3,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 9960.9545
  },
  "results": [
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations APPROVED: foreign run references must be hidden after employee transfer",
      "ms": 5782.2579,
      "pass": false,
      "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n    applied: null,\n+   reserved: 1,\n-   reserved: null,\n    reversal: null\n  }\n",
      "cause": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n    applied: null,\n+   reserved: 1,\n-   reserved: null,\n    reversal: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n    applied: null,\n+   reserved: 1,\n-   reserved: null,\n    reversal: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations PAID: foreign run references must be hidden after employee transfer",
      "ms": 885.4507,
      "pass": false,
      "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 2,\n+   reserved: 2,\n-   applied: null,\n-   reserved: null,\n    reversal: null\n  }\n",
      "cause": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 2,\n+   reserved: 2,\n-   applied: null,\n-   reserved: null,\n    reversal: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 2,\n+   reserved: 2,\n-   applied: null,\n-   reserved: null,\n    reversal: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations REVERSED: foreign run references must be hidden after employee transfer",
      "ms": 1021.123,
      "pass": false,
      "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 3,\n+   reserved: 3,\n+   reversal: 4\n-   applied: null,\n-   reserved: null,\n-   reversal: null\n  }\n",
      "cause": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 3,\n+   reserved: 3,\n+   reversal: 4\n-   applied: null,\n-   reserved: null,\n-   reversal: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 3,\n+   reserved: 3,\n+   reversal: 4\n-   applied: null,\n-   reserved: null,\n-   reversal: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations APPROVED: foreign run references must be hidden after employee transfer",
      "ms": 5782.2579,
      "pass": false,
      "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n    applied: null,\n+   reserved: 1,\n-   reserved: null,\n    reversal: null\n  }\n",
      "cause": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n    applied: null,\n+   reserved: 1,\n-   reserved: null,\n    reversal: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n    applied: null,\n+   reserved: 1,\n-   reserved: null,\n    reversal: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations PAID: foreign run references must be hidden after employee transfer",
      "ms": 885.4507,
      "pass": false,
      "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 2,\n+   reserved: 2,\n-   applied: null,\n-   reserved: null,\n    reversal: null\n  }\n",
      "cause": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 2,\n+   reserved: 2,\n-   applied: null,\n-   reserved: null,\n    reversal: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 2,\n+   reserved: 2,\n-   applied: null,\n-   reserved: null,\n    reversal: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations REVERSED: foreign run references must be hidden after employee transfer",
      "ms": 1021.123,
      "pass": false,
      "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 3,\n+   reserved: 3,\n+   reversal: 4\n-   applied: null,\n-   reserved: null,\n-   reversal: null\n  }\n",
      "cause": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 3,\n+   reserved: 3,\n+   reversal: 4\n-   applied: null,\n-   reserved: null,\n-   reversal: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 3,\n+   reserved: 3,\n+   reversal: 4\n-   applied: null,\n-   reserved: null,\n-   reversal: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"raw-obligation-run-reference\",\"stage\":\"APPROVED\",\"runReadStatus\":403,\"listStatus\":200,\"branchRefs\":{\"reserved\":1,\"applied\":null,\"reversal\":null},\"companyRefs\":{\"reserved\":1,\"applied\":null,\"reversal\":null},\"cancelRefs\":{\"reserved\":1,\"applied\":null,\"reversal\":null},\"cancelStatus\":\"CANCELLED\",\"amount\":123.45,\"net\":9123.45,\"readsLeaveLedgerUnchanged\":true}",
    "{\"case\":\"raw-obligation-run-reference\",\"stage\":\"PAID\",\"runReadStatus\":403,\"listStatus\":200,\"branchRefs\":{\"reserved\":2,\"applied\":2,\"reversal\":null},\"companyRefs\":{\"reserved\":2,\"applied\":2,\"reversal\":null},\"cancelRefs\":null,\"cancelStatus\":null,\"amount\":123.45,\"net\":9123.45,\"readsLeaveLedgerUnchanged\":true}",
    "{\"case\":\"raw-obligation-run-reference\",\"stage\":\"REVERSED\",\"runReadStatus\":403,\"listStatus\":200,\"branchRefs\":{\"reserved\":3,\"applied\":3,\"reversal\":4},\"companyRefs\":{\"reserved\":3,\"applied\":3,\"reversal\":4},\"cancelRefs\":null,\"cancelStatus\":null,\"amount\":123.45,\"net\":9123.45,\"readsLeaveLedgerUnchanged\":true}",
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9960.9545"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r36_ledger_test_af1904fa5852cfa1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r36_ledger_test_af1904fa5852cfa1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r36_ledger_test_af1904fa5852cfa1\"}\n"
  ]
}
