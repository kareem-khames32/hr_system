module.exports = {
  "selected": [
    "codex-review-p5d-receipt-pool",
    "codex-review-p5d-expenses",
    "codex-review-p5d-extended",
    "codex-review-p5d-expense-pool",
    "codex-review-p5d-calendar-pool",
    "codex-review-p5d-expense-transitive"
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
    "duration_ms": 61348.7757
  },
  "results": [
    {
      "file": "codex-review-p5d-receipt-pool.integration.cjs",
      "name": "P5D-E11: receipt-bearing expense resubmissions succeed with the full connection pool",
      "ms": 10259.6757,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-receipt-pool.integration.cjs",
      "name": "P5D-E12: receipt-free resubmissions succeed under the same barrier and full pool",
      "ms": 1352.1456,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E01: first expense submission without a human approval is rejected",
      "ms": 9096.9786,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E02: return invalidates old approval; a fresh review posts the revised amount once",
      "ms": 417.3769,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E04: conditional steps disappearing cannot reuse an approval before return",
      "ms": 220.3412,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E05: authorized human HR on-behalf submission succeeds",
      "ms": 120.3255,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expenses.integration.cjs",
      "name": "P5D-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 146.6094,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-extended.integration.cjs",
      "name": "P5D-E07: custom expense and travel destinations need approval after each return; retries do not duplicate effects",
      "ms": 9859.5366,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-extended.integration.cjs",
      "name": "P5D-E08: non-HR creator on behalf cannot approve their own creation",
      "ms": 197.3221,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-pool.integration.cjs",
      "name": "P5D-E03: ten expense submissions succeed with all pool connections held",
      "ms": 9771.42,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-pool.integration.cjs",
      "name": "P5D-E10: ten expense submissions succeed including audience reads with all pool connections held",
      "ms": 916.5072,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 8807.344,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 790.7624,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 561.7964,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 2493.3544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 2715.898,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T01: structural approval-chain resolution still requests another connection during expense submit",
      "ms": 12424.9544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: independent final approvals can deadlock in human approval lookup, roll back and retry safely",
      "ms": 18215.2858,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5D-E11\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"ledgerRows\":0}",
    "{\"id\":\"P5D-E12\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"withoutReceipt\":true}",
    "Cleanup verified: hr_expense_reports_test_aea0d3e11eb754bc is absent from sys.databases.",
    "{\"id\":\"P5D-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "{\"id\":\"P5D-E02\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5D-E02-fresh-round\",\"postedAmount\":999,\"ledgerRows\":1}",
    "{\"id\":\"P5D-E04\",\"reviewedAmount\":123,\"postedAmount\":0,\"oldApprovals\":1,\"newApprovals\":0,\"status\":400}",
    "{\"id\":\"P5D-E05\",\"status\":201,\"validHumanOnBehalfAccepted\":true}",
    "{\"id\":\"P5D-E06\",\"customExpense\":400,\"customAdvance\":400}",
    "Cleanup verified: hr_expense_reports_test_475d70084952f45f is absent from sys.databases.",
    "{\"id\":\"P5D-E07\",\"outcomes\":[{\"code\":\"P5D_EXT_EXPENSE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"P5D_EXT_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1},{\"code\":\"TRAVEL_ADVANCE\",\"staleApproval\":400,\"freshAmount\":999,\"rows\":1}]}",
    "{\"id\":\"P5D-E08\",\"creatorApproval\":403,\"otherHumanApproval\":201,\"ledgerRows\":1}",
    "Cleanup verified: hr_expense_reports_test_d32086a129e36063 is absent from sys.databases.",
    "{\"id\":\"P5D-E03\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "{\"id\":\"P5D-E10\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "Cleanup verified: hr_expense_reports_test_665690a905ee4a20 is absent from sys.databases.",
    "{\"id\":\"P5D-L01\",\"days\":{\"total\":8,\"working\":5,\"skipped\":[\"2026-12-30\",\"2027-01-01\",\"2027-01-02\"]},\"matched\":true}",
    "{\"id\":\"P5D-L02\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"days\":5}",
    "{\"id\":\"P5D-L03\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201]}",
    "{\"id\":\"P5D-L04\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"retry\":201}",
    "{\"id\":\"P5D-L05\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"retry\":201}",
    "Cleanup verified: hr_expense_reports_test_b9e0b2abe4f7c394 is absent from sys.databases.",
    "{\"id\":\"P5D-T01\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"errors\":[{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}],\"serialRetry\":201}",
    "{\"id\":\"P5D-T01-control\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"errors\":[]}",
    "{\"id\":\"P5D-T02\",\"kind\":\"EXPENSE_REPORT\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[400,400,400,400,400,400,201,400,400,400],\"errors\":[{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}],\"oneEffectPerRequest\":true}",
    "{\"id\":\"P5D-T02\",\"kind\":\"TRAVEL_ADVANCE\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[400,400,400,400,400,201,400,400,400,400],\"errors\":[{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}],\"oneEffectPerRequest\":true}",
    "Cleanup verified: hr_expense_reports_test_3a69fe5d47c38001 is absent from sys.databases.",
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 61348.7757"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_aea0d3e11eb754bc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_aea0d3e11eb754bc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_475d70084952f45f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_475d70084952f45f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_d32086a129e36063\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_d32086a129e36063\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_665690a905ee4a20\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_665690a905ee4a20\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_b9e0b2abe4f7c394\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_b9e0b2abe4f7c394\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_3a69fe5d47c38001\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"responses\":[{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"}]}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"responses\":[{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201}]}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 70) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 69) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 66) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 72) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 68) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 67) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 74) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 73) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 55) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":201},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"}]}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 55) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 71) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 73) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 74) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 67) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 72) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 66) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 69) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 70) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":201},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_3a69fe5d47c38001\"}\n"
  ]
}
