module.exports = {
  "selected": [
    "codex-review-p5d-calendar-pool"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 17540.5357
  },
  "results": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 8328.3108,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 721.2819,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 547.9062,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 2539.6789,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 2712.5691,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5D-L01\",\"days\":{\"total\":8,\"working\":5,\"skipped\":[\"2026-12-30\",\"2027-01-01\",\"2027-01-02\"]},\"matched\":true}",
    "{\"id\":\"P5D-L02\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"days\":5}",
    "{\"id\":\"P5D-L03\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201]}",
    "{\"id\":\"P5D-L04\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"retry\":201}",
    "{\"id\":\"P5D-L05\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"retry\":201}",
    "Cleanup verified: hr_expense_reports_test_f3e02fcce57f2f14 is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 17540.5357"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_f3e02fcce57f2f14\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_f3e02fcce57f2f14\"}\n"
  ]
}
