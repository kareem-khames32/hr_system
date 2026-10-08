module.exports = {
  "selected": [
    "codex-review-p5a-expenses",
    "codex-review-p5a-compensation"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 12163.8513
  },
  "results": [
    {
      "file": "codex-review-p5a-expenses.integration.cjs",
      "name": "P5A-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 8883.965,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-compensation.integration.cjs",
      "name": "P5A-C01: compensation exposes moved department identity",
      "ms": 9063.0364,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-compensation.integration.cjs",
      "name": "P5A-C02: prior line adjuster can approve after another edit",
      "ms": 225.8702,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5A-E01\",\"money\":123,\"ledgerRows\":1,\"humanApprovals\":0}",
    "Cleanup verified: hr_expense_reports_test_999c708c2c8cb4ef is absent from sys.databases.",
    "{\"id\":\"P5A-C01\",\"foreignDepartmentId\":2,\"leaked\":true}",
    "{\"id\":\"P5A-C02\",\"blockedBeforeSecondEdit\":true,\"previousAuthorApproved\":true}",
    "Cleanup verified: hr_comp_cycles_test_93daaaade83a3eea is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12163.8513"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_999c708c2c8cb4ef\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_999c708c2c8cb4ef\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_93daaaade83a3eea\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_93daaaade83a3eea\"}\n"
  ]
}
