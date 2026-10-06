module.exports = {
  "selected": [
    "codex-review-p2v-reason"
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
    "duration_ms": 16347.8222
  },
  "results": [
    {
      "file": "codex-review-p2v-reason.integration.cjs",
      "name": "P2V A accepted 500-character return reason should retain its final explanation in history",
      "ms": 12633.0578,
      "pass": false,
      "error": "An accepted reason must not lose its final explanation to the automatic prefix\n\nfalse !== true\n",
      "cause": "An accepted reason must not lose its final explanation to the automatic prefix\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: An accepted reason must not lose its final explanation to the automatic prefix\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-reason.integration.cjs:12:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2v-reason.integration.cjs",
      "name": "P2V A accepted 500-character return reason should retain its final explanation in history",
      "ms": 12633.0578,
      "pass": false,
      "error": "An accepted reason must not lose its final explanation to the automatic prefix\n\nfalse !== true\n",
      "cause": "An accepted reason must not lose its final explanation to the automatic prefix\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: An accepted reason must not lose its final explanation to the automatic prefix\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-reason.integration.cjs:12:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"maximum-return-reason\",\"status\":201,\"inputLength\":500,\"storedLength\":500,\"finalExplanationRetained\":false}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16347.8222"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2v_reason_test_c282de6106e3e941\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2v_reason_test_c282de6106e3e941\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2v_reason_test_c282de6106e3e941\"}\n"
  ]
}
