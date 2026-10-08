module.exports = {
  "selected": [
    "codex-review-p5c-receipt-pool"
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
    "duration_ms": 23761.8386
  },
  "results": [
    {
      "file": "codex-review-p5c-receipt-pool.integration.cjs",
      "name": "P5C-E11: receipt-bearing expense resubmissions still exhaust the connection pool",
      "ms": 17572.8608,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5C-E11\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"failed\":10,\"retry\":201,\"ledgerRows\":0}",
    "Cleanup verified: hr_expense_reports_test_2689f3e0525ac866 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23761.8386"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_2689f3e0525ac866\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_2689f3e0525ac866\"}\n"
  ]
}
