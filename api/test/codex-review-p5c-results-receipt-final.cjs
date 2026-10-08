module.exports = {
  "selected": [
    "codex-review-p5c-receipt-pool"
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
    "duration_ms": 18088.3534
  },
  "results": [
    {
      "file": "codex-review-p5c-receipt-pool.integration.cjs",
      "name": "P5C-E11: receipt-bearing expense resubmissions still exhaust the connection pool",
      "ms": 11839.959,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-receipt-pool.integration.cjs",
      "name": "P5C-E12: receipt-free resubmissions succeed under the same barrier and full pool",
      "ms": 1171.6024,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5C-E11\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"failed\":10,\"retry\":201,\"ledgerRows\":0}",
    "{\"id\":\"P5C-E12\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"withoutReceipt\":true}",
    "Cleanup verified: hr_expense_reports_test_b416661a1e1e9b34 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18088.3534"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_b416661a1e1e9b34\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_b416661a1e1e9b34\"}\n"
  ]
}
