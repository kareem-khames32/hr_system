module.exports = {
  "selected": [
    "codex-review-p2p-independent"
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
    "duration_ms": 12541.8769
  },
  "results": [
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P internal rows cannot alter public truncation, reply references or author identity after transfer",
      "ms": 7733.7771,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic Comment Employee 2'\n- 'Synthetic Comment Employee 5'\n                              ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic Comment Employee 2'\n- 'Synthetic Comment Employee 5'\n                              ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic Comment Employee 2'\n- 'Synthetic Comment Employee 5'\n                              ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-independent.integration.cjs:20:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "ms": 688.8373,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P immediate and digest email recheck current requester identity, with active-recipient controls",
      "ms": 930.9641,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "ms": 121.1044,
      "pass": false,
      "error": "POST /policies/1/versions: 400 {\"message\":\"تاريخ السريان من النهارده أو بعده\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /policies/1/versions: 400 {\"message\":\"تاريخ السريان من النهارده أو بعده\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /policies/1/versions: 400 {\"message\":\"تاريخ السريان من النهارده أو بعده\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-independent.integration.cjs:74:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P internal rows cannot alter public truncation, reply references or author identity after transfer",
      "ms": 7733.7771,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic Comment Employee 2'\n- 'Synthetic Comment Employee 5'\n                              ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic Comment Employee 2'\n- 'Synthetic Comment Employee 5'\n                              ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic Comment Employee 2'\n- 'Synthetic Comment Employee 5'\n                              ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-independent.integration.cjs:20:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "ms": 121.1044,
      "pass": false,
      "error": "POST /policies/1/versions: 400 {\"message\":\"تاريخ السريان من النهارده أو بعده\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /policies/1/versions: 400 {\"message\":\"تاريخ السريان من النهارده أو بعده\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /policies/1/versions: 400 {\"message\":\"تاريخ السريان من النهارده أو بعده\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-independent.integration.cjs:74:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"emailIdentityChecks\":[{\"mode\":\"ON\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"ON\",\"revoked\":true,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"DIGEST\",\"revoked\":true,\"status\":\"SKIPPED\"}],\"realMail\":false}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12541.8769"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_independent_test_396a02bc5937c46c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_independent_test_396a02bc5937c46c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2p_independent_test_396a02bc5937c46c\"}\n"
  ]
}
