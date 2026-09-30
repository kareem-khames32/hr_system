module.exports = {
  "selected": [
    "codex-review-round21-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 9289.2809
  },
  "results": [
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 real payroll filtered totals and register equal the hand sum; excluded department and branch add nothing",
      "ms": 6617.2368,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 mark-filtered serializes two stale callers and writes exactly the filtered employees once",
      "ms": 144.2243,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 old request counts must not reveal the transferred requester department or team outside viewer scope",
      "ms": 6.8152,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'destinationHandler', table 'hr_codex_r21_independent_test_d2bfeb433f3e8804.dbo.request_types'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'destinationHandler', table 'hr_codex_r21_independent_test_d2bfeb433f3e8804.dbo.request_types'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'destinationHandler', table 'hr_codex_r21_independent_test_d2bfeb433f3e8804.dbo.request_types'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 bank-sheet client filter and financial register use the same payroll snapshot after employee transfer",
      "ms": 178.1537,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nNaN !== 9000.33\n",
      "cause": "Expected values to be strictly equal:\n\nNaN !== 9000.33\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nNaN !== 9000.33\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:99:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 old request counts must not reveal the transferred requester department or team outside viewer scope",
      "ms": 6.8152,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'destinationHandler', table 'hr_codex_r21_independent_test_d2bfeb433f3e8804.dbo.request_types'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'destinationHandler', table 'hr_codex_r21_independent_test_d2bfeb433f3e8804.dbo.request_types'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'destinationHandler', table 'hr_codex_r21_independent_test_d2bfeb433f3e8804.dbo.request_types'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 bank-sheet client filter and financial register use the same payroll snapshot after employee transfer",
      "ms": 178.1537,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nNaN !== 9000.33\n",
      "cause": "Expected values to be strictly equal:\n\nNaN !== 9000.33\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nNaN !== 9000.33\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:99:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"filtered-real-payroll\",\"netAmounts\":[6000.11,3000.22,2000.33],\"filteredHandSum\":9000.33,\"report\":{\"id\":1,\"name\":\"مسير فلتر أ\",\"period\":\"2026-09\",\"status\":\"APPROVED\",\"scopeType\":\"BRANCH\",\"scopeLabel\":\"فرع: فرع أ\",\"runType\":\"REGULAR\",\"parentRunId\":null,\"branchId\":null,\"branchName\":null,\"startDate\":\"2026-08-23\",\"endDate\":\"2026-09-22\",\"storedTotalNet\":null,\"employees\":2,\"excluded\":0,\"totalNet\":\"9000.33\",\"reversedEmployees\":0,\"reversedNet\":\"0.00\",\"partial\":true},\"disbursement\":{\"paid\":{\"count\":0,\"total\":0,\"bank\":0,\"cash\":0},\"unpaid\":{\"count\":2,\"total\":9000.33,\"bank\":0,\"cash\":9000.33},\"payable\":{\"count\":2,\"total\":9000.33,\"bank\":0,\"cash\":9000.33},\"settlement\":{\"count\":0,\"total\":0},\"noAmount\":0,\"issues\":0}}",
    "{\"case\":\"mark-filtered-race\",\"sqlWaiters\":2,\"statuses\":[201,409],\"markedIds\":[1,2],\"events\":1}",
    "{\"case\":\"bank-filter-after-transfer\",\"registerEmployeeIds\":[1,2],\"bankEmployeeIds\":[1,2],\"registerTotal\":null,\"bankTotal\":9000.33}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9289.2809"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r21_independent_test_d2bfeb433f3e8804\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r21_independent_test_d2bfeb433f3e8804\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r21_independent_test_d2bfeb433f3e8804\"}\n"
  ]
}
