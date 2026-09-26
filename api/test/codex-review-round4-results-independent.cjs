module.exports = {
  "selected": [
    "codex-review-round4-independent",
    "codex-review-round4-migrations"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 6,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 13679.109
  },
  "results": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 4000.7233,
      "pass": false,
      "error": "Uppercase key bypassed category-chain endpoint and permissions",
      "cause": "Uppercase key bypassed category-chain endpoint and permissions",
      "stack": "AssertionError [ERR_ASSERTION]: Uppercase key bypassed category-chain endpoint and permissions\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 28.0821,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 22.0889,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:45:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 payroll separation licence cannot evade its specific permission by SQL case folding",
      "ms": 47.4881,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:58:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 17.6297,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r4independent_test_908729d069c6e53a.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r4independent_test_908729d069c6e53a.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r4independent_test_908729d069c6e53a.dbo.attendance_days'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 HR permission grants one financial effect for another employee, never own request or outside scope",
      "ms": 60.2958,
      "pass": false,
      "error": "POST /requests: 400 {\"message\":\"حقول غير معرّفة لنوع «Review financial credit»: amount، description — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /requests: 400 {\"message\":\"حقول غير معرّفة لنوع «Review financial credit»: amount، description — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests: 400 {\"message\":\"حقول غير معرّفة لنوع «Review financial credit»: amount، description — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round4-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:78:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 exemption subject cannot approve or reject an exemption created by someone else",
      "ms": 46.6034,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-migrations.integration.cjs",
      "name": "CR4 migrations 068 and 069 are additive, idempotent and match all entity metadata",
      "ms": 5250.2516,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 4000.7233,
      "pass": false,
      "error": "Uppercase key bypassed category-chain endpoint and permissions",
      "cause": "Uppercase key bypassed category-chain endpoint and permissions",
      "stack": "AssertionError [ERR_ASSERTION]: Uppercase key bypassed category-chain endpoint and permissions\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 28.0821,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 22.0889,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:45:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 payroll separation licence cannot evade its specific permission by SQL case folding",
      "ms": 47.4881,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:58:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 17.6297,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r4independent_test_908729d069c6e53a.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r4independent_test_908729d069c6e53a.dbo.attendance_days'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'shiftName', table 'hr_codex_r4independent_test_908729d069c6e53a.dbo.attendance_days'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 HR permission grants one financial effect for another employee, never own request or outside scope",
      "ms": 60.2958,
      "pass": false,
      "error": "POST /requests: 400 {\"message\":\"حقول غير معرّفة لنوع «Review financial credit»: amount، description — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /requests: 400 {\"message\":\"حقول غير معرّفة لنوع «Review financial credit»: amount، description — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests: 400 {\"message\":\"حقول غير معرّفة لنوع «Review financial credit»: amount، description — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round4-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:78:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"category-case-folding\",\"canonicalStatus\":400,\"directStatus\":403,\"uppercaseStatus\":200,\"storedCategoryChain\":2,\"typeChain\":1,\"expectedChain\":1}",
    "{\"probe\":\"request-existence\",\"foreign\":403,\"missing\":404,\"foreignBody\":{\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403},\"missingBody\":{\"message\":\"الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"exemption-existence\",\"foreign\":403,\"missing\":404,\"foreignBody\":{\"message\":\"الموظف خارج الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403},\"missingBody\":{\"message\":\"الموظف غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"payroll-licence-case-folding\",\"normalStatus\":403,\"uppercaseStatus\":200,\"storedValue\":\"true\",\"actorHasLicence\":false}",
    "{\"probe\":\"exemption-subject-SOD\",\"approve\":403,\"reject\":403,\"state\":\"PENDING\"}",
    "{\"migrationFiles\":[\"20260926_068_user_branch_scopes.sql\",\"20260926_069_work_schedule_weekend_exceptions.sql\"],\"runsEach\":2,\"entitySchemaDelta\":0,\"rowCountsUnchanged\":true,\"backfill\":false,\"engine\":{\"version\":\"16.0.4255.1\",\"edition\":\"Express Edition (64-bit)\",\"compatibility\":150}}",
    "tests 8",
    "suites 0",
    "pass 2",
    "fail 6",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13679.109"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_r4independent_test_908729d069c6e53a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r4migrations_test_278517e2e28cd702\"}\n"
  ]
}
