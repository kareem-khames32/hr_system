module.exports = {
  "selected": [
    "codex-review-p5e-expense-transitive",
    "codex-review-p5e-calendar-pool",
    "codex-review-p5e-receipt-pool",
    "codex-review-p5e-expenses",
    "codex-review-p5e-extended",
    "codex-review-p5e-expense-pool"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 18,
      "failed": 0,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 18,
      "suites": 0
    },
    "duration_ms": 45725.1476
  },
  "results": [
    {
      "file": "codex-review-p5e-expense-transitive.integration.cjs",
      "name": "P5E-T01: structural approval-chain resolution completes within the held transaction connection",
      "ms": 10689.5202,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expense-transitive.integration.cjs",
      "name": "P5E-T02: independent final expense and travel approvals complete concurrently",
      "ms": 2210.4795,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-calendar-pool.integration.cjs",
      "name": "P5E-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 8878.433,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-calendar-pool.integration.cjs",
      "name": "P5E-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 739.8316,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-calendar-pool.integration.cjs",
      "name": "P5E-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 564.082,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-calendar-pool.integration.cjs",
      "name": "P5E-L04: default backdate-policy read uses the held transaction connection inside leave submit",
      "ms": 560.7375,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-calendar-pool.integration.cjs",
      "name": "P5E-L05: balance sufficiency reads use the held transaction connection inside leave submit",
      "ms": 898.8134,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-receipt-pool.integration.cjs",
      "name": "P5E-E11: receipt-bearing expense resubmissions succeed with the full connection pool",
      "ms": 11806.378,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-receipt-pool.integration.cjs",
      "name": "P5E-E12: receipt-free resubmissions succeed under the same barrier and full pool",
      "ms": 1676.789,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expenses.integration.cjs",
      "name": "P5E-E01: first expense submission without a human approval is rejected",
      "ms": 10450.8971,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expenses.integration.cjs",
      "name": "P5E-E02: return invalidates old approval; a fresh review posts the revised amount once",
      "ms": 599.5234,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expenses.integration.cjs",
      "name": "P5E-E04: conditional steps disappearing cannot reuse an approval before return",
      "ms": 324.4912,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expenses.integration.cjs",
      "name": "P5E-E05: authorized human HR on-behalf submission succeeds",
      "ms": 203.5811,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expenses.integration.cjs",
      "name": "P5E-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 207.3421,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-extended.integration.cjs",
      "name": "P5E-E07: custom expense and travel destinations need approval after each return; retries do not duplicate effects",
      "ms": 10821.856,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-extended.integration.cjs",
      "name": "P5E-E08: non-HR creator on behalf cannot approve their own creation",
      "ms": 185.8636,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expense-pool.integration.cjs",
      "name": "P5E-E03: ten expense submissions succeed with all pool connections held",
      "ms": 10661.6404,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-expense-pool.integration.cjs",
      "name": "P5E-E10: ten expense submissions succeed including audience reads with all pool connections held",
      "ms": 954.0844,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5E-T01\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"errors\":[],\"closed\":true}",
    "{\"id\":\"P5E-T01-control\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"errors\":[]}",
    "{\"id\":\"P5E-T02\",\"kind\":\"EXPENSE_REPORT\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"errors\":[],\"oneEffectPerRequest\":true}",
    "{\"id\":\"P5E-T02\",\"kind\":\"TRAVEL_ADVANCE\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"errors\":[],\"oneEffectPerRequest\":true}",
    "Cleanup verified: hr_expense_reports_test_281d20c41fa1e0bd is absent from sys.databases.",
    "{\"id\":\"P5E-L01\",\"days\":{\"total\":8,\"working\":5,\"skipped\":[\"2026-12-30\",\"2027-01-01\",\"2027-01-02\"]},\"matched\":true}",
    "{\"id\":\"P5E-L02\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"days\":5}",
    "{\"id\":\"P5E-L03\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201]}",
    "{\"id\":\"P5E-L04\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"closed\":true}",
    "{\"id\":\"P5E-L05\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"closed\":true}",
    "Cleanup verified: hr_expense_reports_test_dab642bec00bb894 is absent from sys.databases.",
    "{\"id\":\"P5E-E11\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"ledgerRows\":0}",
    "{\"id\":\"P5E-E12\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"withoutReceipt\":true}",
    "Cleanup verified: hr_expense_reports_test_715c3b948af0a6e2 is absent from sys.databases.",
    "{\"id\":\"P5E-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "{\"id\":\"P5E-E02\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5E-E02-fresh-round\",\"postedAmount\":999,\"ledgerRows\":1}",
    "{\"id\":\"P5E-E04\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5E-E05\",\"status\":201,\"validHumanOnBehalfAccepted\":true}",
    "{\"id\":\"P5E-E06\",\"customExpense\":400,\"customAdvance\":400}",
    "Cleanup verified: hr_expense_reports_test_5a35102bb2718a5f is absent from sys.databases.",
    "{\"id\":\"P5E-E07\",\"outcomes\":[{\"code\":\"P5E_EXT_EXPENSE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"P5E_EXT_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"TRAVEL_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1}]}",
    "{\"id\":\"P5E-E08\",\"creatorApproval\":403,\"otherHumanApproval\":201,\"ledgerRows\":1}",
    "Cleanup verified: hr_expense_reports_test_13f9c3058a06de1f is absent from sys.databases.",
    "{\"id\":\"P5E-E03\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "{\"id\":\"P5E-E10\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "Cleanup verified: hr_expense_reports_test_5195db7d8deeb73d is absent from sys.databases.",
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 45725.1476"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_281d20c41fa1e0bd\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"responses\":[{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201}]}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"responses\":[{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201}]}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201}]}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_281d20c41fa1e0bd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_dab642bec00bb894\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_dab642bec00bb894\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_715c3b948af0a6e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_715c3b948af0a6e2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_5a35102bb2718a5f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_5a35102bb2718a5f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_13f9c3058a06de1f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_13f9c3058a06de1f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_5195db7d8deeb73d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_5195db7d8deeb73d\"}\n"
  ]
}
