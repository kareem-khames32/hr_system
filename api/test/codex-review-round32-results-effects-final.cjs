module.exports = {
  "selected": [
    "codex-review-round32-holiday-effects"
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
    "duration_ms": 8704.3752
  },
  "results": [
    {
      "file": "codex-review-round32-holiday-effects.integration.cjs",
      "name": "CR32 update returns ordinary detail, recomputes covered overtime and rebuilds only the unreserved holiday credit",
      "ms": 6267.1665,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"holiday-update-financial-effects\",\"initialCredit\":300,\"newCredit\":225,\"afterCancel\":0,\"coveredOvertimeRecomputed\":1,\"replyEqualsGet\":true,\"noDuplicateCredit\":true}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8704.3752"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r32_holiday_effects_test_fd4adab411c5635c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r32_holiday_effects_test_fd4adab411c5635c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r32_holiday_effects_test_fd4adab411c5635c\"}\n"
  ]
}
