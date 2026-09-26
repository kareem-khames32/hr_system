module.exports = {
  "selected": [
    "codex-review-round5-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 5,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 7111.5342
  },
  "results": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B01 canonicalization covers mixed case, trailing spaces and every later validator branch",
      "ms": 3962.0793,
      "pass": false,
      "error": "PUT /settings/request-categories/training/chain: 400 {\"message\":\"السلسلة «Review chain» لسه مالهاش خطوات — ضيف المعتمدين الأول، وإلا طلبات الفئة كلها هتقف\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "PUT /settings/request-categories/training/chain: 400 {\"message\":\"السلسلة «Review chain» لسه مالهاش خطوات — ضيف المعتمدين الأول، وإلا طلبات الفئة كلها هتقف\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PUT /settings/request-categories/training/chain: 400 {\"message\":\"السلسلة «Review chain» لسه مالهاش خطوات — ضيف المعتمدين الأول، وإلا طلبات الفئة كلها هتقف\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round5-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:29:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B02 and N02 transferred request detail preserves parties and masks all current organization fields",
      "ms": 213.7064,
      "pass": false,
      "error": "GET /requests/1: 403 {\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "cause": "GET /requests/1: 403 {\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /requests/1: 403 {\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round5-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:73:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N01 history matrix covers global, multi-branch, legacy, deleted and forbidden definitions",
      "ms": 434.1095,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 report uses inclusive start and end, ignores cancelled/pre-rehire cases and preserves real presence",
      "ms": 28.9158,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 archive near local midnight must retain the same final day as employmentWindowOf",
      "ms": 33.0843,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 176.3079,
      "pass": false,
      "error": "Inbox disclosed current foreign title",
      "cause": "Inbox disclosed current foreign title",
      "stack": "AssertionError [ERR_ASSERTION]: Inbox disclosed current foreign title\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:177:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B01 canonicalization covers mixed case, trailing spaces and every later validator branch",
      "ms": 3962.0793,
      "pass": false,
      "error": "PUT /settings/request-categories/training/chain: 400 {\"message\":\"السلسلة «Review chain» لسه مالهاش خطوات — ضيف المعتمدين الأول، وإلا طلبات الفئة كلها هتقف\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "PUT /settings/request-categories/training/chain: 400 {\"message\":\"السلسلة «Review chain» لسه مالهاش خطوات — ضيف المعتمدين الأول، وإلا طلبات الفئة كلها هتقف\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PUT /settings/request-categories/training/chain: 400 {\"message\":\"السلسلة «Review chain» لسه مالهاش خطوات — ضيف المعتمدين الأول، وإلا طلبات الفئة كلها هتقف\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round5-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:29:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B02 and N02 transferred request detail preserves parties and masks all current organization fields",
      "ms": 213.7064,
      "pass": false,
      "error": "GET /requests/1: 403 {\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "cause": "GET /requests/1: 403 {\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /requests/1: 403 {\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round5-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:73:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 report uses inclusive start and end, ignores cancelled/pre-rehire cases and preserves real presence",
      "ms": 28.9158,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 archive near local midnight must retain the same final day as employmentWindowOf",
      "ms": 33.0843,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r5boundaries_test_85125d3692d21e08.dbo.attendance_days'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 176.3079,
      "pass": false,
      "error": "Inbox disclosed current foreign title",
      "cause": "Inbox disclosed current foreign title",
      "stack": "AssertionError [ERR_ASSERTION]: Inbox disclosed current foreign title\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:177:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"historyMatrix\":[{\"kind\":\"SHIFT\",\"expected\":[200,200,200,404],\"actual\":[200,200,200,404]},{\"kind\":\"SHIFT\",\"expected\":[200,200,404,404],\"actual\":[200,200,404,404]},{\"kind\":\"SHIFT\",\"expected\":[200,200,200,200],\"actual\":[200,200,200,200]},{\"kind\":\"SHIFT\",\"expected\":[403,403,403,403],\"actual\":[403,403,403,403]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,200,404],\"actual\":[200,200,200,404]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,404,404],\"actual\":[200,200,404,404]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,200,200],\"actual\":[200,200,200,200]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[403,403,403,403],\"actual\":[403,403,403,403]}],\"deletedCompanyOnly\":true}",
    "{\"probe\":\"inbox-after-transfer\",\"employeeStatus\":404,\"detailHidden\":true,\"detailTitle\":null,\"inboxTitle\":\"NEW FOREIGN JOB R5\",\"oldTitle\":\"OLD JOB R5\",\"newTitle\":\"NEW FOREIGN JOB R5\"}",
    "tests 6",
    "suites 0",
    "pass 1",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7111.5342"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5boundaries_test_85125d3692d21e08\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5boundaries_test_85125d3692d21e08\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5boundaries_test_85125d3692d21e08\"}\n"
  ]
}
