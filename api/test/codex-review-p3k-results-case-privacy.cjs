module.exports = {
  "selected": [
    "codex-review-p3k-case-privacy"
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
    "duration_ms": 7626.975
  },
  "results": [
    {
      "file": "codex-review-p3k-case-privacy.integration.cjs",
      "name": "P3K-C01: handler account rebound to respondent retains full case and complainant identity",
      "ms": 5139.6426,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7626.975"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_case_test_ad04a49b0f070991\"}\n",
    "REVIEW_MEASURE {\"case\":\"C01\",\"unlistedAdmin\":404,\"reboundRespondent\":200,\"complainantExposed\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_case_test_ad04a49b0f070991\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_case_test_ad04a49b0f070991\"}\n"
  ]
}
