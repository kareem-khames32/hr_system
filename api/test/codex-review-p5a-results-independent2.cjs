module.exports = {
  "selected": [
    "codex-review-p5a-feedback",
    "codex-review-p5a-expenses"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 20787.373
  },
  "results": [
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F01: close does not serialize with feedback response",
      "ms": 9929.2114,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F02: optional comment below minimum is published",
      "ms": 9.3286,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F03: calendar changes its default shape",
      "ms": 64.0031,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-expenses.integration.cjs",
      "name": "P5A-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 9952.0867,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5A-F01\",\"closeStatus\":200,\"counts\":[3,4],\"inferredRating\":5}",
    "{\"id\":\"P5A-F02\",\"responses\":4,\"comments\":1}",
    "{\"id\":\"P5A-F03\",\"featureOff\":true,\"addedMeetings\":true}",
    "Cleanup verified: hr_people_feedback_test_bfd74d2407e3ea03 is absent from sys.databases.",
    "{\"id\":\"P5A-E01\",\"money\":123,\"ledgerRows\":1,\"humanApprovals\":0}",
    "Cleanup verified: hr_expense_reports_test_a37e415dc8453abe is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 20787.373"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_people_feedback_test_bfd74d2407e3ea03\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_people_feedback_test_bfd74d2407e3ea03\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_a37e415dc8453abe\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_a37e415dc8453abe\"}\n"
  ]
}
