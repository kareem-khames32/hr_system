module.exports = {
  "selected": [
    "codex-review-p5a-reports",
    "codex-review-p5a-mobile",
    "codex-review-p5a-compensation",
    "codex-review-p5a-feedback",
    "codex-review-p5a-expenses"
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
    "duration_ms": 34232.7956
  },
  "results": [
    {
      "file": "codex-review-p5a-reports.integration.cjs",
      "name": "P5A-R01: confidential definition is still included by builder",
      "ms": 9178.9344,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-mobile.integration.cjs",
      "name": "P5A-M01: accepted mobile punch is attached to a different fingerprint owner",
      "ms": 9214.2983,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-compensation.integration.cjs",
      "name": "P5A-C01: compensation exposes moved department identity",
      "ms": 8643.8202,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F01: close does not serialize with feedback response",
      "ms": 8646.5176,
      "pass": false,
      "error": "{\"message\":\"Cannot POST /api/performance/cycles/1/close\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "cause": "{\"message\":\"Cannot POST /api/performance/cycles/1/close\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Cannot POST /api/performance/cycles/1/close\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-feedback.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-feedback.integration.cjs:115:83)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F02: optional comment below minimum is published",
      "ms": 15.1526,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'strengths')",
      "cause": "Cannot read properties of undefined (reading 'strengths')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'strengths')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-feedback.integration.cjs:124:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F03: calendar changes its default shape",
      "ms": 65.4006,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-expenses.integration.cjs",
      "name": "P5A-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 8113.5376,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_expense_reports_test_fea7625d757ec7b2.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_expense_reports_test_fea7625d757ec7b2.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'nameAr', table 'hr_expense_reports_test_fea7625d757ec7b2.dbo.approval_chains'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F01: close does not serialize with feedback response",
      "ms": 8646.5176,
      "pass": false,
      "error": "{\"message\":\"Cannot POST /api/performance/cycles/1/close\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "cause": "{\"message\":\"Cannot POST /api/performance/cycles/1/close\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Cannot POST /api/performance/cycles/1/close\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-feedback.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-feedback.integration.cjs:115:83)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p5a-feedback.integration.cjs",
      "name": "P5A-F02: optional comment below minimum is published",
      "ms": 15.1526,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'strengths')",
      "cause": "Cannot read properties of undefined (reading 'strengths')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'strengths')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-feedback.integration.cjs:124:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5a-expenses.integration.cjs",
      "name": "P5A-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 8113.5376,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_expense_reports_test_fea7625d757ec7b2.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_expense_reports_test_fea7625d757ec7b2.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'nameAr', table 'hr_expense_reports_test_fea7625d757ec7b2.dbo.approval_chains'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5A-R01\",\"confidentialDefinition\":true,\"exportedRows\":1}",
    "Cleanup verified: hr_report_builder_test_36cd41b9f73d256b is absent from sys.databases.",
    "{\"id\":\"P5A-M01\",\"status\":201,\"ownPunches\":0,\"otherEmployeePunches\":1}",
    "Cleanup verified: hr_mobile_punch_test_b7d10ce29a2a0071 is absent from sys.databases.",
    "{\"id\":\"P5A-C01\",\"foreignDepartmentId\":2,\"leaked\":true}",
    "Cleanup verified: hr_comp_cycles_test_61f434e5d346a9f2 is absent from sys.databases.",
    "{\"id\":\"P5A-F03\",\"featureOff\":true,\"addedMeetings\":true}",
    "Cleanup verified: hr_people_feedback_test_1ea5e60eda8e209d is absent from sys.databases.",
    "Cleanup verified: hr_expense_reports_test_fea7625d757ec7b2 is absent from sys.databases.",
    "tests 7",
    "suites 0",
    "pass 4",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 34232.7956"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_builder_test_36cd41b9f73d256b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_builder_test_36cd41b9f73d256b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mobile_punch_test_b7d10ce29a2a0071\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mobile_punch_test_b7d10ce29a2a0071\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_61f434e5d346a9f2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_61f434e5d346a9f2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_people_feedback_test_1ea5e60eda8e209d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_people_feedback_test_1ea5e60eda8e209d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_fea7625d757ec7b2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_fea7625d757ec7b2\"}\n"
  ]
}
