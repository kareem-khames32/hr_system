module.exports = {
  "selected": [
    "codex-review-p5c-expenses",
    "codex-review-p5c-expense-pool",
    "codex-review-p5c-schedule"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 25082.3055
  },
  "results": [
    {
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E01: first expense submission without a human approval is rejected",
      "ms": 8905.8472,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E02: return invalidates old approval; a fresh review posts the revised amount once",
      "ms": 422.4239,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E04: conditional steps disappearing cannot reuse an approval before return",
      "ms": 254.6055,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E05: authorized human HR on-behalf submission succeeds",
      "ms": 165.0058,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 178.572,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-expense-pool.integration.cjs",
      "name": "P5C-E03: ten expense submissions succeed with all pool connections held",
      "ms": 9659.8508,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-schedule.integration.cjs",
      "name": "P5C-S01: ten submissions finish with a full pool and transaction-local feature reads",
      "ms": 9672.8575,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-schedule.integration.cjs",
      "name": "P5C-S02: missing 076 tables preserves default shift submission",
      "ms": 234.4382,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5C-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "{\"id\":\"P5C-E02\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5C-E02-fresh-round\",\"postedAmount\":999,\"ledgerRows\":1}",
    "{\"id\":\"P5C-E04\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5C-E05\",\"status\":201,\"validHumanOnBehalfAccepted\":true}",
    "{\"id\":\"P5C-E06\",\"customExpense\":400,\"customAdvance\":400}",
    "Cleanup verified: hr_expense_reports_test_ac43d92d8164a98c is absent from sys.databases.",
    "{\"id\":\"P5C-E03\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "Cleanup verified: hr_expense_reports_test_466435aa63d5e9c5 is absent from sys.databases.",
    "{\"id\":\"P5C-S01\",\"featureOff\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "{\"id\":\"P5C-S02\",\"missing076\":true,\"status\":201}",
    "Cleanup verified: hr_swap_consents_test_97ccfce287237556 is absent from sys.databases.",
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 25082.3055"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_ac43d92d8164a98c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_ac43d92d8164a98c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_466435aa63d5e9c5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_466435aa63d5e9c5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_97ccfce287237556\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_97ccfce287237556\"}\n"
  ]
}
