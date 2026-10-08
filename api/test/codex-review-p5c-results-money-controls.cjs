module.exports = {
  "selected": [
    "codex-review-p5c-extended"
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
    "duration_ms": 11788.1325
  },
  "results": [
    {
      "file": "codex-review-p5c-extended.integration.cjs",
      "name": "P5C-E07: custom expense and travel destinations need approval after each return; retries do not duplicate effects",
      "ms": 8977.1526,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-extended.integration.cjs",
      "name": "P5C-E08: non-HR creator on behalf cannot approve their own creation",
      "ms": 139.1756,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5C-E07\",\"outcomes\":[{\"code\":\"P5C_EXT_EXPENSE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"P5C_EXT_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"TRAVEL_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1}]}",
    "{\"id\":\"P5C-E08\",\"creatorApproval\":403,\"otherHumanApproval\":201,\"ledgerRows\":1}",
    "Cleanup verified: hr_expense_reports_test_9a338561326ce0f0 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11788.1325"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_9a338561326ce0f0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_9a338561326ce0f0\"}\n"
  ]
}
