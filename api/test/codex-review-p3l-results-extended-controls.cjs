module.exports = {
  "selected": [
    "codex-review-p3l-case-privacy",
    "codex-review-p3l-penalties"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 10044.9832
  },
  "results": [
    {
      "file": "codex-review-p3l-case-privacy.integration.cjs",
      "name": "P3L-C01: handler account rebound to respondent loses full case and complainant identity",
      "ms": 5838.6221,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-penalties.integration.cjs",
      "name": "P3L-P04: manual HTTP financial reason is accepted as an unrelated penalty request",
      "ms": 7233.5032,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10044.9832"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3l_case_test_42058f98abf3b5cf\"}\n",
    "REVIEW_MEASURE {\"case\":\"C01\",\"unlistedAdmin\":404,\"reboundRespondent\":404,\"complainantExposed\":false,\"oldUploaderFile\":404,\"write\":404,\"upload\":403}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3l_case_test_42058f98abf3b5cf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3l_case_test_42058f98abf3b5cf\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_5a6329d2441aacad\"}\n",
    "REVIEW_MEASURE {\"case\":\"P04\",\"manualHttp\":201,\"penaltyHttp\":201,\"penaltyDays\":1,\"linkedFixedAmount\":7,\"wrongFinancialType\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_5a6329d2441aacad\"}\n"
  ]
}
