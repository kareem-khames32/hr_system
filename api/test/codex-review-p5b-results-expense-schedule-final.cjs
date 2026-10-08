module.exports = {
  "selected": [
    "codex-review-p5b-expenses",
    "codex-review-p5b-schedule"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 12876.8743
  },
  "results": [
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 9196.3755,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E02: old approval authorizes a changed amount after return and automatic resubmission",
      "ms": 302.932,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E04: old approval authorizes a changed amount after conditional steps disappear on resubmission",
      "ms": 237.876,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E05: authorized HR on-behalf submission is rejected despite human review",
      "ms": 116.2294,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-schedule.integration.cjs",
      "name": "P5B-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 9776.7086,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-schedule.integration.cjs",
      "name": "P5B-S02: missing old module tables no longer falls back for shift submit",
      "ms": 231.108,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5B-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "{\"id\":\"P5B-E02\",\"reviewedAmount\":123,\"postedAmount\":999,\"oldApprovals\":1,\"newApprovals\":0,\"status\":201}",
    "{\"id\":\"P5B-E04\",\"reviewedAmount\":123,\"postedAmount\":999,\"oldApprovals\":1,\"newApprovals\":0,\"status\":201}",
    "{\"id\":\"P5B-E05\",\"status\":400,\"validHumanOnBehalfRejected\":true}",
    "Cleanup verified: hr_expense_reports_test_ef6a979b0b5a6653 is absent from sys.databases.",
    "{\"id\":\"P5B-S01\",\"featureOff\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "{\"id\":\"P5B-S02\",\"missing076\":true,\"status\":500}",
    "Cleanup verified: hr_swap_consents_test_4301bee8972625e7 is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12876.8743"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_ef6a979b0b5a6653\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_ef6a979b0b5a6653\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_4301bee8972625e7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_4301bee8972625e7\"}\n"
  ]
}
