module.exports = {
  "selected": [
    "codex-review-p5b-expenses"
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
    "duration_ms": 11374.0314
  },
  "results": [
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 8359.0122,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E02: old approval authorizes a changed amount after return and automatic resubmission",
      "ms": 337.9641,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5B-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "{\"id\":\"P5B-E02\",\"reviewedAmount\":123,\"postedAmount\":999,\"oldApprovals\":1,\"newApprovals\":0,\"status\":201}",
    "Cleanup verified: hr_expense_reports_test_f5a337cb20bb7e19 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11374.0314"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_f5a337cb20bb7e19\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_f5a337cb20bb7e19\"}\n"
  ]
}
