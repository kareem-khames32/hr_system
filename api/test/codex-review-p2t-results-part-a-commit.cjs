module.exports = {
  "selected": [
    "codex-review-p2t-independent",
    "codex-review-p2t-auditor-units"
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
    "duration_ms": 12219.7029
  },
  "results": [
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: initial draft submission must recheck current employee attributes",
      "ms": 5635.4637,
      "pass": false,
      "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
      "ms": 107.2047,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-auditor-units.integration.cjs",
      "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
      "ms": 2.9608,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:12:84)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: initial draft submission must recheck current employee attributes",
      "ms": 5635.4637,
      "pass": false,
      "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
      "ms": 107.2047,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-auditor-units.integration.cjs",
      "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
      "ms": 2.9608,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:12:84)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"attribute-draft-recheck\",\"freshCreate\":403,\"draftSubmit\":201,\"state\":\"UNDER_REVIEW\"}",
    "{\"case\":\"invalid-condition\",\"catalog\":true,\"submit\":201,\"nationalityMissing\":true}",
    "{\"case\":\"malformed-runtime-conditions\",\"actual\":[true,true,true,true]}",
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12219.7029"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS Part A server modules read from a66d0c9; evaluated only in memory\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_independent_test_dbd8c4113dcaa1b4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_independent_test_dbd8c4113dcaa1b4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_independent_test_dbd8c4113dcaa1b4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS Part A server modules read from a66d0c9; evaluated only in memory\n"
  ]
}
