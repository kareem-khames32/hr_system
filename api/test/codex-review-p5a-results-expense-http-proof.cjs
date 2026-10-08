module.exports = {
  "selected": [
    "codex-review-p5a-expenses"
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
    "duration_ms": 11328.8131
  },
  "results": [
    {
      "file": "codex-review-p5a-expenses.integration.cjs",
      "name": "P5A-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 8622.5945,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5A-E01\",\"money\":123,\"ledgerRows\":1,\"humanApprovals\":0}",
    "Cleanup verified: hr_expense_reports_test_664fdbd4f2ee7496 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11328.8131"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_664fdbd4f2ee7496\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_664fdbd4f2ee7496\"}\n"
  ]
}
