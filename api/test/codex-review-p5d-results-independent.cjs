module.exports = {
  "selected": [
    "codex-review-p5d-receipt-pool",
    "codex-review-p5d-expenses",
    "codex-review-p5d-extended",
    "codex-review-p5d-expense-pool"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 11,
      "failed": 0,
      "passed": 11,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 11,
      "suites": 0
    },
    "duration_ms": 30484.8978
  },
  "results": [
    {
      "file": "codex-review-p5d-receipt-pool.integration.cjs",
      "name": "P5D-E11: receipt-bearing expense resubmissions succeed with the full connection pool",
      "ms": 10224.8186,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-receipt-pool.integration.cjs",
      "name": "P5D-E12: receipt-free resubmissions succeed under the same barrier and full pool",
      "ms": 1311.0184,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E01: first expense submission without a human approval is rejected",
      "ms": 9036.2169,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E02: return invalidates old approval; a fresh review posts the revised amount once",
      "ms": 418.8281,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E04: conditional steps disappearing cannot reuse an approval before return",
      "ms": 209.3907,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E05: authorized human HR on-behalf submission succeeds",
      "ms": 126.968,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 133.9019,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-extended.integration.cjs",
      "name": "P5D-E07: custom expense and travel destinations need approval after each return; retries do not duplicate effects",
      "ms": 12259.2801,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-extended.integration.cjs",
      "name": "P5D-E08: non-HR creator on behalf cannot approve their own creation",
      "ms": 284.4897,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-pool.integration.cjs",
      "name": "P5D-E03: ten expense submissions succeed with all pool connections held",
      "ms": 12225.7031,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-pool.integration.cjs",
      "name": "P5D-E10: ten expense submissions succeed including audience reads with all pool connections held",
      "ms": 1073.892,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5D-E11\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"ledgerRows\":0}",
    "{\"id\":\"P5D-E12\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"withoutReceipt\":true}",
    "Cleanup verified: hr_expense_reports_test_d7b78730709bd915 is absent from sys.databases.",
    "{\"id\":\"P5D-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "{\"id\":\"P5D-E02\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5D-E02-fresh-round\",\"postedAmount\":999,\"ledgerRows\":1}",
    "{\"id\":\"P5D-E04\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5D-E05\",\"status\":201,\"validHumanOnBehalfAccepted\":true}",
    "{\"id\":\"P5D-E06\",\"customExpense\":400,\"customAdvance\":400}",
    "Cleanup verified: hr_expense_reports_test_0772d0215030150e is absent from sys.databases.",
    "{\"id\":\"P5D-E07\",\"outcomes\":[{\"code\":\"P5D_EXT_EXPENSE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"P5D_EXT_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"TRAVEL_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1}]}",
    "{\"id\":\"P5D-E08\",\"creatorApproval\":403,\"otherHumanApproval\":201,\"ledgerRows\":1}",
    "Cleanup verified: hr_expense_reports_test_35004d189861fa35 is absent from sys.databases.",
    "{\"id\":\"P5D-E03\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "{\"id\":\"P5D-E10\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "Cleanup verified: hr_expense_reports_test_391d4b553cd214dd is absent from sys.databases.",
    "tests 11",
    "suites 0",
    "pass 11",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 30484.8978"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_d7b78730709bd915\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_d7b78730709bd915\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_0772d0215030150e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_0772d0215030150e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_35004d189861fa35\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_35004d189861fa35\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_391d4b553cd214dd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_391d4b553cd214dd\"}\n"
  ]
}
