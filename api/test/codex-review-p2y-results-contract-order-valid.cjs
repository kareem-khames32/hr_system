module.exports = {
  "selected": [
    "codex-review-p2y-contract-lock-order"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 11632.7612
  },
  "results": [
    {
      "file": "codex-review-p2y-contract-lock-order.integration.cjs",
      "name": "P2Y contract renewal and request approval complete without an unhandled lock-order failure",
      "ms": 8931.7749,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2y-contract-lock-order.integration.cjs",
      "name": "P2Y contract renewal and request approval complete without an unhandled lock-order failure",
      "ms": 8931.7749,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"contract-bank-lock-order\",\"approval\":201,\"renewal\":500,\"sqlError\":1205}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11632.7612"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2y_contract_order_test_5c2fb8253b8971c2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2y_contract_order_test_5c2fb8253b8971c2\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2y_contract_order_test_5c2fb8253b8971c2\"}\n"
  ]
}
