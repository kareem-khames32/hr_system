module.exports = {
  "selected": [
    "codex-review-p3k-penalties"
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
    "duration_ms": 9553.1863
  },
  "results": [
    {
      "file": "codex-review-p3k-penalties.integration.cjs",
      "name": "P3K-P01: unchanged occurrence accepts a different monetary penalty than preview",
      "ms": 6802.2797,
      "pass": false,
      "error": "{\"code\":\"DEDUCTION_ABOVE_PCT_OF_GROSS\",\"message\":\"مبلغ الخصم 3000.00 يتجاوز الحد 2250.00 (25% من إجمالي الراتب 9000.00)\",\"limit\":\"2250.00\",\"amount\":\"3000.00\"}\n\n400 !== 201\n",
      "cause": "{\"code\":\"DEDUCTION_ABOVE_PCT_OF_GROSS\",\"message\":\"مبلغ الخصم 3000.00 يتجاوز الحد 2250.00 (25% من إجمالي الراتب 9000.00)\",\"limit\":\"2250.00\",\"amount\":\"3000.00\"}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"code\":\"DEDUCTION_ABOVE_PCT_OF_GROSS\",\"message\":\"مبلغ الخصم 3000.00 يتجاوز الحد 2250.00 (25% من إجمالي الراتب 9000.00)\",\"limit\":\"2250.00\",\"amount\":\"3000.00\"}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-penalties.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3k-penalties.integration.cjs",
      "name": "P3K-P01: unchanged occurrence accepts a different monetary penalty than preview",
      "ms": 6802.2797,
      "pass": false,
      "error": "{\"code\":\"DEDUCTION_ABOVE_PCT_OF_GROSS\",\"message\":\"مبلغ الخصم 3000.00 يتجاوز الحد 2250.00 (25% من إجمالي الراتب 9000.00)\",\"limit\":\"2250.00\",\"amount\":\"3000.00\"}\n\n400 !== 201\n",
      "cause": "{\"code\":\"DEDUCTION_ABOVE_PCT_OF_GROSS\",\"message\":\"مبلغ الخصم 3000.00 يتجاوز الحد 2250.00 (25% من إجمالي الراتب 9000.00)\",\"limit\":\"2250.00\",\"amount\":\"3000.00\"}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"code\":\"DEDUCTION_ABOVE_PCT_OF_GROSS\",\"message\":\"مبلغ الخصم 3000.00 يتجاوز الحد 2250.00 (25% من إجمالي الراتب 9000.00)\",\"limit\":\"2250.00\",\"amount\":\"3000.00\"}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-penalties.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 9553.1863"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_252206264c4ea42d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_252206264c4ea42d\"}\n"
  ]
}
