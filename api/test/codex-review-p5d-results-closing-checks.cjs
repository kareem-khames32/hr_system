module.exports = {
  "selected": [
    "codex-review-p5d-calendar-pool",
    "codex-review-p5d-expense-transitive"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 7,
      "failed": 3,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 39739.8517
  },
  "results": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 8753.773,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 741.4739,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 6165.8238,
      "pass": false,
      "error": "calendar barrier\n\n0 !== 1\n",
      "cause": "calendar barrier\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: calendar barrier\n\n0 !== 1\n\n    at calendarPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:130:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:150:47)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 6214.0556,
      "pass": false,
      "error": "barrier maxBackdateDays\n\n0 !== 1\n",
      "cause": "barrier maxBackdateDays\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier maxBackdateDays\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:156:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 6142.4567,
      "pass": false,
      "error": "barrier assertSufficient\n\n0 !== 1\n",
      "cause": "barrier assertSufficient\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier assertSufficient\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:164:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T01: structural approval-chain resolution still requests another connection during expense submit",
      "ms": 12487.7294,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: independent final approvals can deadlock in human approval lookup, roll back and retry safely",
      "ms": 21454.0254,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 6165.8238,
      "pass": false,
      "error": "calendar barrier\n\n0 !== 1\n",
      "cause": "calendar barrier\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: calendar barrier\n\n0 !== 1\n\n    at calendarPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:130:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:150:47)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 6214.0556,
      "pass": false,
      "error": "barrier maxBackdateDays\n\n0 !== 1\n",
      "cause": "barrier maxBackdateDays\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier maxBackdateDays\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:156:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 6142.4567,
      "pass": false,
      "error": "barrier assertSufficient\n\n0 !== 1\n",
      "cause": "barrier assertSufficient\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier assertSufficient\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:164:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5D-L01\",\"days\":{\"total\":8,\"working\":5,\"skipped\":[\"2026-12-30\",\"2027-01-01\",\"2027-01-02\"]},\"matched\":true}",
    "{\"id\":\"P5D-L02\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"days\":5}",
    "Cleanup verified: hr_expense_reports_test_7c88e5b3d1f02253 is absent from sys.databases.",
    "{\"id\":\"P5D-T01\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"errors\":[{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}],\"serialRetry\":201}",
    "{\"id\":\"P5D-T01-control\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"errors\":[]}",
    "{\"id\":\"P5D-T02\",\"kind\":\"EXPENSE_REPORT\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[400,400,400,400,400,400,201,400,400,400],\"errors\":[{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}],\"oneEffectPerRequest\":true}",
    "{\"id\":\"P5D-T02\",\"kind\":\"TRAVEL_ADVANCE\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[400,400,400,201,400,400,400,400,400,400],\"errors\":[{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"},{\"number\":1205,\"code\":\"EREQUEST\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}],\"oneEffectPerRequest\":true}",
    "Cleanup verified: hr_expense_reports_test_b34ae884dcf648a5 is absent from sys.databases.",
    "tests 7",
    "suites 0",
    "pass 4",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 39739.8517"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_7c88e5b3d1f02253\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_7c88e5b3d1f02253\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_b34ae884dcf648a5\"}\n",
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
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 83) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 82) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 76) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 60) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 74) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 78) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 79) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 77) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 72) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":201},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"}]}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 81) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 72) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 78) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 83) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 77) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 74) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 60) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 76) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 82) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":201},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_b34ae884dcf648a5\"}\n"
  ]
}
