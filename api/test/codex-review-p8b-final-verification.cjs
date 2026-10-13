module.exports = {
  "target": "a9f3b332abc2e8b0ec0c1dca8c760874e28de206",
  "trackedFilesUnchanged": 5372,
  "databasesAbsent": 24,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_missing_punch_test_5eff639cbdb4252e",
    "hr_hiring_suggest_test_12d9c311d58ae351",
    "hr_review_evaluator_test_40e7d1ef999a8470",
    "hr_meet_test_10c37d9b07be1e61",
    "hr_meet_calls_test_8e3643d9123ad5d3",
    "hr_mailbox_test_75496444d16b7d37",
    "hr_saved_reports_test_869c6a09c5e0d656",
    "hr_payroll_exemptions_test_d65988df898ec4c7",
    "hr_session_cookie_test_81267a3712753548",
    "hr_user_sessions_test_8fdac447afff724e",
    "hr_positions_test_4131485394f0cd9f",
    "hr_perf_reviews_test_e0476d10ec16df9f",
    "hr_recruitment_jobs_test_12dbe841c60b7030",
    "hr_missing_punch_test_52e92f5bf79d6b8e",
    "hr_missing_punch_test_31af974e9524565b",
    "hr_review_evaluator_test_8a4ff9878a095284",
    "hr_p8b_positions_test_857bcefbb9b3fb8c",
    "hr_meet_calls_test_b278d6c68da1dfbb",
    "hr_review_evaluator_test_9ad0aca9f0c0aab3",
    "hr_missing_punch_test_d73c8dad6a658507",
    "hr_review_evaluator_test_cb8dfabf4a468273",
    "hr_p8b_positions_test_f6b588c81ad3d404",
    "hr_meet_calls_test_8ed15eec88df6144",
    "hr_saved_reports_test_355cb9083222b5c9"
  ],
  "results": [
    {
      "file": "codex-review-p8b-results-affected.cjs",
      "counts": {
        "tests": 87,
        "failed": 3,
        "passed": 84,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 87,
        "suites": 0
      },
      "failures": [
        {
          "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
          "error": "Expected values to be strictly equal:\n\n500 !== 200\n"
        },
        {
          "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
          "error": "Expected values to be strictly equal:\n\n0 !== 1\n"
        },
        {
          "name": "SR-04 (CRP3D): the owner is judged again after the file is built — a file built with a withdrawn scope or right does not go out",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n"
        }
      ]
    },
    {
      "file": "codex-review-p8b-results-approval-boundary.cjs",
      "counts": {
        "tests": 7,
        "failed": 0,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p8b-results-closure.cjs",
      "counts": {
        "tests": 13,
        "failed": 1,
        "passed": 12,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 13,
        "suites": 0
      },
      "failures": [
        {
          "name": "P8B-R01: employee transferred after scope judgment before evaluator write",
          "error": "Expected values to be strictly equal:\n\n1 !== undefined\n"
        }
      ]
    },
    {
      "file": "codex-review-p8b-results-evaluator-final.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p8b-results-final.cjs",
      "counts": {
        "tests": 16,
        "failed": 0,
        "passed": 16,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 16,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p8b-results-pdf-control.cjs",
      "counts": {
        "tests": 4,
        "failed": 3,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
          "error": "Expected values to be strictly equal:\n\n500 !== 200\n"
        },
        {
          "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
          "error": "Expected values to be strictly equal:\n\n0 !== 1\n"
        },
        {
          "name": "SR-04 (CRP3D): the owner is judged again after the file is built — a file built with a withdrawn scope or right does not go out",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n"
        }
      ]
    }
  ]
}
