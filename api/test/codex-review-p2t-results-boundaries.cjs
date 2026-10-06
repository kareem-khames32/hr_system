module.exports = {
  "selected": [
    "codex-review-p2t-independent",
    "codex-review-p2t-concurrency"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 5,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 23712.0622
  },
  "results": [
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: initial draft submission must recheck current employee attributes",
      "ms": 4507.1171,
      "pass": false,
      "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
      "ms": 170.6997,
      "pass": false,
      "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "cause": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
      "ms": 63.5826,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: edit-only permission must not commit values then answer forbidden",
      "ms": 29.6437,
      "pass": false,
      "error": "A forbidden response must not follow a committed write",
      "cause": "A forbidden response must not follow a committed write",
      "stack": "AssertionError [ERR_ASSERTION]: A forbidden response must not follow a committed write\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:55:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save",
      "ms": 206.8568,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2t-concurrency.integration.cjs",
      "name": "P2T two value saves serialize on employee and retain both distinct keys",
      "ms": 13732.8192,
      "pass": false,
      "error": "Expected SQL blocker not reached",
      "cause": "Expected SQL blocker not reached",
      "stack": "Error: Expected SQL blocker not reached\n    at blocked (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-concurrency.integration.cjs:11:8)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-concurrency.integration.cjs:18:89)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-concurrency.integration.cjs",
      "name": "P2T a transfer holding the employee row forces the waiting writer to recheck branch after lock",
      "ms": 74.6596,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2t-concurrency.integration.cjs",
      "name": "P2T malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
      "ms": 87.4244,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: initial draft submission must recheck current employee attributes",
      "ms": 4507.1171,
      "pass": false,
      "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
      "ms": 170.6997,
      "pass": false,
      "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "cause": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
      "ms": 63.5826,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: edit-only permission must not commit values then answer forbidden",
      "ms": 29.6437,
      "pass": false,
      "error": "A forbidden response must not follow a committed write",
      "cause": "A forbidden response must not follow a committed write",
      "stack": "AssertionError [ERR_ASSERTION]: A forbidden response must not follow a committed write\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:55:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-concurrency.integration.cjs",
      "name": "P2T two value saves serialize on employee and retain both distinct keys",
      "ms": 13732.8192,
      "pass": false,
      "error": "Expected SQL blocker not reached",
      "cause": "Expected SQL blocker not reached",
      "stack": "Error: Expected SQL blocker not reached\n    at blocked (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-concurrency.integration.cjs:11:8)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-concurrency.integration.cjs:18:89)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"attribute-draft-recheck\",\"freshCreate\":403,\"draftSubmit\":201,\"state\":\"UNDER_REVIEW\"}",
    "{\"case\":\"restricted-custom-draft\",\"freshCreate\":403,\"draftSubmit\":201,\"state\":\"UNDER_REVIEW\"}",
    "{\"case\":\"invalid-condition\",\"catalog\":true,\"submit\":201,\"nationalityMissing\":true}",
    "{\"case\":\"edit-only-save\",\"status\":403,\"stored\":\"committed despite error\"}",
    "{\"rcsi\":false,\"writeAfterMove\":404,\"noWrite\":true}",
    "tests 8",
    "suites 0",
    "pass 3",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23712.0622"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_independent_test_9308209170f4323a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_independent_test_9308209170f4323a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_independent_test_9308209170f4323a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_concurrency_test_bb4b9cecf11db671\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_concurrency_test_bb4b9cecf11db671\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_concurrency_test_bb4b9cecf11db671\"}\n"
  ]
}
