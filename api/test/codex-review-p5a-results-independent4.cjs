module.exports = {
  "selected": [
    "codex-review-p5a-reports",
    "codex-review-p5a-schedule"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 12266.4688
  },
  "results": [
    {
      "file": "codex-review-p5a-reports.integration.cjs",
      "name": "P5A-R01: confidential definition is still included by builder",
      "ms": 9225.1876,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-schedule.integration.cjs",
      "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 9427.069,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n6 !== 10\n",
      "cause": "Expected values to be strictly equal:\n\n6 !== 10\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n6 !== 10\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-schedule.integration.cjs:118:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5a-schedule.integration.cjs",
      "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 9427.069,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n6 !== 10\n",
      "cause": "Expected values to be strictly equal:\n\n6 !== 10\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n6 !== 10\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-schedule.integration.cjs:118:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5A-R01\",\"confidentialDefinition\":true,\"exportedRows\":1}",
    "Cleanup verified: hr_report_builder_test_afce1239dcbb2d18 is absent from sys.databases.",
    "Cleanup verified: hr_swap_consents_test_fa8f84f0ce4360c6 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12266.4688"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_builder_test_afce1239dcbb2d18\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_builder_test_afce1239dcbb2d18\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_fa8f84f0ce4360c6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_fa8f84f0ce4360c6\"}\n"
  ]
}
