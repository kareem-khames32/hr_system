module.exports = {
  "selected": [
    "codex-review-p3k-rewards",
    "codex-review-p3k-unit-scope",
    "codex-review-p3k-privacy"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 17008.1889
  },
  "results": [
    {
      "file": "codex-review-p3k-rewards.integration.cjs",
      "name": "P3K-R01: post-commit bonus read failure releases reservation and retry creates another bonus",
      "ms": 7861.4734,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-unit-scope.integration.cjs",
      "name": "P3K-U01: calibration and mandatory-training views expose current foreign department names",
      "ms": 6246.8354,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-privacy.integration.cjs",
      "name": "P3K-S01: live aggregates reveal a single anonymous choice by subtraction; sparse question reveals one answer",
      "ms": 5469.8782,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 17008.1889"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_rewards_test_57100fdfbafd5267\"}\n",
    "REVIEW_MEASURE {\"case\":\"R01\",\"first\":500,\"committedAfterError\":1,\"reservationAfterError\":\"SUGGESTED\",\"retry\":200,\"bonusRequests\":2}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_rewards_test_57100fdfbafd5267\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_unit_scope_test_d83e6f120a12bac9\"}\n",
    "REVIEW_MEASURE {\"case\":\"U01\",\"calibrationForeignUnit\":true,\"trainingForeignUnit\":true,\"hiddenParentDirect\":404,\"hiddenParentTitleViaChild\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_unit_scope_test_d83e6f120a12bac9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_unit_scope_test_d83e6f120a12bac9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_survey_test_0a2f2fb68835b56e\"}\n",
    "REVIEW_MEASURE {\"case\":\"S01\",\"anonymous\":true,\"liveDelta\":[0,1],\"sparseAnswered\":1,\"sparseAverage\":2,\"foreignDepartmentExposed\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_survey_test_0a2f2fb68835b56e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_survey_test_0a2f2fb68835b56e\"}\n"
  ]
}
