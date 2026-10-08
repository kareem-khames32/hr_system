module.exports = {
  "selected": [
    "codex-review-p5b-expense-pool"
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
    "duration_ms": 44638.1361
  },
  "results": [
    {
      "file": "codex-review-p5b-expense-pool.integration.cjs",
      "name": "P5B-E03: expense submissions exhaust pool through typeFeatureOpen",
      "ms": 36496.4368,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5B-E03\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"settingStatus\":500}",
    "Cleanup verified: hr_expense_reports_test_03ae827d1d21741d is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 44638.1361"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_03ae827d1d21741d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_03ae827d1d21741d\"}\n"
  ]
}
