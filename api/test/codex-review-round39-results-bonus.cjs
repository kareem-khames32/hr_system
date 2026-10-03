module.exports = {
  "selected": [
    "codex-review-round39-bonus-control"
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
    "duration_ms": 7687.2652
  },
  "results": [
    {
      "file": "codex-review-round39-bonus-control.integration.cjs",
      "name": "CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it",
      "ms": 5243.8165,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'some')",
      "cause": "Cannot read properties of undefined (reading 'some')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'some')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-bonus-control.integration.cjs:25:203)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round39-bonus-control.integration.cjs",
      "name": "CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it",
      "ms": 5243.8165,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'some')",
      "cause": "Cannot read properties of undefined (reading 'some')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'some')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-bonus-control.integration.cjs:25:203)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 7687.2652"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_bonus_test_6112bdbe2d9f60ec\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_bonus_test_6112bdbe2d9f60ec\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_bonus_test_6112bdbe2d9f60ec\"}\n"
  ]
}
