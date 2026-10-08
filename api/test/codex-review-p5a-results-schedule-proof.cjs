module.exports = {
  "selected": [
    "codex-review-p5a-schedule"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 13452.7427
  },
  "results": [
    {
      "file": "codex-review-p5a-schedule.integration.cjs",
      "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 10800.9495,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5A-S01\",\"featureOff\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"settingStatus\":500}",
    "Cleanup verified: hr_swap_consents_test_91da486d2d90c59e is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13452.7427"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_91da486d2d90c59e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_91da486d2d90c59e\"}\n"
  ]
}
