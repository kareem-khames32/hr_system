module.exports = {
  "selected": [
    "codex-review-p5d-calendar-pool"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 4,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 30013.3843
  },
  "results": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 8119.9247,
      "pass": false,
      "error": "Error: Cannot insert duplicate key row in object 'dbo.leave_types' with unique index 'IDX_600530eb1d9f853dd746e5819c'. The duplicate key value is (CASUAL).",
      "cause": "Error: Cannot insert duplicate key row in object 'dbo.leave_types' with unique index 'IDX_600530eb1d9f853dd746e5819c'. The duplicate key value is (CASUAL).",
      "stack": "QueryFailedError: Error: Cannot insert duplicate key row in object 'dbo.leave_types' with unique index 'IDX_600530eb1d9f853dd746e5819c'. The duplicate key value is (CASUAL).\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 751.4466,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 6131.0381,
      "pass": false,
      "error": "calendar barrier\n\n0 !== 1\n",
      "cause": "calendar barrier\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: calendar barrier\n\n0 !== 1\n\n    at calendarPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:129:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:149:47)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 6145.9342,
      "pass": false,
      "error": "barrier maxBackdateDays\n\n0 !== 1\n",
      "cause": "barrier maxBackdateDays\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier maxBackdateDays\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:124:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:155:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 6184.815,
      "pass": false,
      "error": "barrier assertSufficient\n\n0 !== 1\n",
      "cause": "barrier assertSufficient\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier assertSufficient\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:124:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:163:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 8119.9247,
      "pass": false,
      "error": "Error: Cannot insert duplicate key row in object 'dbo.leave_types' with unique index 'IDX_600530eb1d9f853dd746e5819c'. The duplicate key value is (CASUAL).",
      "cause": "Error: Cannot insert duplicate key row in object 'dbo.leave_types' with unique index 'IDX_600530eb1d9f853dd746e5819c'. The duplicate key value is (CASUAL).",
      "stack": "QueryFailedError: Error: Cannot insert duplicate key row in object 'dbo.leave_types' with unique index 'IDX_600530eb1d9f853dd746e5819c'. The duplicate key value is (CASUAL).\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 6131.0381,
      "pass": false,
      "error": "calendar barrier\n\n0 !== 1\n",
      "cause": "calendar barrier\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: calendar barrier\n\n0 !== 1\n\n    at calendarPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:129:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:149:47)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 6145.9342,
      "pass": false,
      "error": "barrier maxBackdateDays\n\n0 !== 1\n",
      "cause": "barrier maxBackdateDays\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier maxBackdateDays\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:124:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:155:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 6184.815,
      "pass": false,
      "error": "barrier assertSufficient\n\n0 !== 1\n",
      "cause": "barrier assertSufficient\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier assertSufficient\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:124:203)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:163:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5D-L02\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"days\":5}",
    "Cleanup verified: hr_expense_reports_test_74423105add5a386 is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 1",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 30013.3843"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_74423105add5a386\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_74423105add5a386\"}\n"
  ]
}
