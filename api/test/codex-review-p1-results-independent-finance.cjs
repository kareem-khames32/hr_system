module.exports = {
  "selected": [
    "codex-review-p1-finance-concurrency",
    "codex-review-p1-restore"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 3,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 23422.7952
  },
  "results": [
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 simultaneous loan disbursements persist exactly one reference without changing balance",
      "ms": 5579.2303,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   404,\n+   404\n-   201,\n-   409\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   404,\n+   404\n-   201,\n-   409\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   404,\n+   404\n-   201,\n-   409\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-finance-concurrency.integration.cjs:14:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 loan disbursement rechecks branch after waiting for the finance lock",
      "ms": 5092.9673,
      "pass": false,
      "error": "finance-lock barrier not entered",
      "cause": "finance-lock barrier not entered",
      "stack": "Error: finance-lock barrier not entered\n    at Timeout._onTimeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-finance-concurrency.integration.cjs:26:90)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 simultaneous settlement payment recordings preserve exactly one reference and the approved net",
      "ms": 373.0273,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p1-restore.integration.cjs",
      "name": "P1 restore and CHECKDB recover a full synthetic schema and exact employee data",
      "ms": 5467.947,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p1_backup_test_31c9c9b799cf97c1.dbo.employees'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p1_backup_test_31c9c9b799cf97c1.dbo.employees'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p1_backup_test_31c9c9b799cf97c1.dbo.employees'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 simultaneous loan disbursements persist exactly one reference without changing balance",
      "ms": 5579.2303,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   404,\n+   404\n-   201,\n-   409\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   404,\n+   404\n-   201,\n-   409\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   404,\n+   404\n-   201,\n-   409\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-finance-concurrency.integration.cjs:14:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 loan disbursement rechecks branch after waiting for the finance lock",
      "ms": 5092.9673,
      "pass": false,
      "error": "finance-lock barrier not entered",
      "cause": "finance-lock barrier not entered",
      "stack": "Error: finance-lock barrier not entered\n    at Timeout._onTimeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-finance-concurrency.integration.cjs:26:90)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p1-restore.integration.cjs",
      "name": "P1 restore and CHECKDB recover a full synthetic schema and exact employee data",
      "ms": 5467.947,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p1_backup_test_31c9c9b799cf97c1.dbo.employees'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p1_backup_test_31c9c9b799cf97c1.dbo.employees'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p1_backup_test_31c9c9b799cf97c1.dbo.employees'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"settlement-once\",\"statuses\":[201,409],\"net\":184855.89,\"netAndStatusUnchanged\":true}",
    "{\"restoredDatabaseDropped\":\"hr_codex_p1_restore_test_27b6d4c110aa6408\",\"ownedBackupDeleted\":\"/var/opt/mssql/data/hr_codex_p1_restore_test_27b6d4c110aa6408.bak\"}",
    "tests 4",
    "suites 0",
    "pass 1",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23422.7952"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_finance_test_721b18149c78a513\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_finance_test_721b18149c78a513\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_finance_test_721b18149c78a513\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_backup_test_31c9c9b799cf97c1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_restore_test_27b6d4c110aa6408\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_backup_test_31c9c9b799cf97c1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_backup_test_31c9c9b799cf97c1\"}\n"
  ]
}
