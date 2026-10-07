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
    "duration_ms": 8766.2252
  },
  "results": [
    {
      "file": "codex-review-p2y-contract-lock-order.integration.cjs",
      "name": "P2Y contract renewal and request approval complete without an unhandled lock-order failure",
      "ms": 6105.9155,
      "pass": false,
      "error": "Renewal missed barrier {\"status\":400,\"body\":{\"message\":[\"بداية العقد بصيغة YYYY-MM-DD\",\"نهاية العقد بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}",
      "cause": "Renewal missed barrier {\"status\":400,\"body\":{\"message\":[\"بداية العقد بصيغة YYYY-MM-DD\",\"نهاية العقد بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}",
      "stack": "Error: Renewal missed barrier {\"status\":400,\"body\":{\"message\":[\"بداية العقد بصيغة YYYY-MM-DD\",\"نهاية العقد بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}\n    at D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:28:67\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async bounded (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:4:53)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:28:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2y-contract-lock-order.integration.cjs",
      "name": "P2Y contract renewal and request approval complete without an unhandled lock-order failure",
      "ms": 6105.9155,
      "pass": false,
      "error": "Renewal missed barrier {\"status\":400,\"body\":{\"message\":[\"بداية العقد بصيغة YYYY-MM-DD\",\"نهاية العقد بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}",
      "cause": "Renewal missed barrier {\"status\":400,\"body\":{\"message\":[\"بداية العقد بصيغة YYYY-MM-DD\",\"نهاية العقد بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}",
      "stack": "Error: Renewal missed barrier {\"status\":400,\"body\":{\"message\":[\"بداية العقد بصيغة YYYY-MM-DD\",\"نهاية العقد بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}\n    at D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:28:67\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async bounded (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:4:53)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-contract-lock-order.integration.cjs:28:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8766.2252"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2y_contract_order_test_8eaa681cc4607362\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2y_contract_order_test_8eaa681cc4607362\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2y_contract_order_test_8eaa681cc4607362\"}\n"
  ]
}
