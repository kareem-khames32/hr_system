module.exports = {
  "selected": [
    "codex-review-p3m-rewards",
    "codex-review-p3m-penalties"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 10443.5163
  },
  "results": [
    {
      "file": "codex-review-p3m-rewards.integration.cjs",
      "name": "P3M-R05: hook failure after instant approval rolls back ledger, request, audit and notification outbox",
      "ms": 7265.8493,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-rewards.integration.cjs",
      "name": "P3M-R06: an abandoned stale claim can be retried but cannot be dismissed",
      "ms": 140.3914,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-penalties.integration.cjs",
      "name": "P3M-P05: penalty hook failure after instant approval rolls back finance and link together",
      "ms": 7428.5989,
      "pass": false,
      "error": "Error: Validation failed for parameter '0'. Invalid string.",
      "cause": "Error: Validation failed for parameter '0'. Invalid string.",
      "stack": "QueryFailedError: Error: Validation failed for parameter '0'. Invalid string.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:2680:17\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3m-penalties.integration.cjs",
      "name": "P3M-P05: penalty hook failure after instant approval rolls back finance and link together",
      "ms": 7428.5989,
      "pass": false,
      "error": "Error: Validation failed for parameter '0'. Invalid string.",
      "cause": "Error: Validation failed for parameter '0'. Invalid string.",
      "stack": "QueryFailedError: Error: Validation failed for parameter '0'. Invalid string.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:2680:17\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10443.5163"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_rewards_test_6a48700509731cbd\"}\n",
    "REVIEW_MEASURE {\"case\":\"R05\",\"approvedInside\":true,\"rollbackTables\":[\"BonusRequest\",\"EmployeeObligation\",\"AuditLog\",\"OutboxEvent\"]}\n",
    "REVIEW_MEASURE {\"case\":\"R06\",\"staleRetryAvailable\":true,\"ownerDismiss\":409,\"managerDismiss\":409}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_rewards_test_6a48700509731cbd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_c5608b8f79fc7db4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_c5608b8f79fc7db4\"}\n"
  ]
}
