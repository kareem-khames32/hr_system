module.exports = {
  "selected": [
    "codex-review-p5a-schedule"
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
    "duration_ms": 20270.4092
  },
  "results": [
    {
      "file": "codex-review-p5a-schedule.integration.cjs",
      "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 17556.971,
      "pass": false,
      "error": "submission 6 must reach feature read\n\n6 !== 7\n",
      "cause": "submission 6 must reach feature read\n\n6 !== 7\n",
      "stack": "AssertionError [ERR_ASSERTION]: submission 6 must reach feature read\n\n6 !== 7\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-schedule.integration.cjs:113:283)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5a-schedule.integration.cjs",
      "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 17556.971,
      "pass": false,
      "error": "submission 6 must reach feature read\n\n6 !== 7\n",
      "cause": "submission 6 must reach feature read\n\n6 !== 7\n",
      "stack": "AssertionError [ERR_ASSERTION]: submission 6 must reach feature read\n\n6 !== 7\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-schedule.integration.cjs:113:283)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_swap_consents_test_ee0020b7639dac4f is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 20270.4092"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_ee0020b7639dac4f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_ee0020b7639dac4f\"}\n"
  ]
}
