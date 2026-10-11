module.exports = {
  "selected": [
    "codex-review-p7b-audience"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 17606.4032
  },
  "results": [
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A05: malformed new audiences reject writes and match nobody in preview",
      "ms": 13450.5131,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A06: moved unit or parent and missing team fail closed in live audience reads",
      "ms": 219.2237,
      "pass": false,
      "error": "Error: The UPDATE statement conflicted with the FOREIGN KEY constraint \"FK_ece1d9122a8f3334815ddba096e\". The conflict occurred in database \"hr_orgaudience_test_c6f3d1f5569b970c\", table \"dbo.departments\", column 'id'.",
      "cause": "Error: The UPDATE statement conflicted with the FOREIGN KEY constraint \"FK_ece1d9122a8f3334815ddba096e\". The conflict occurred in database \"hr_orgaudience_test_c6f3d1f5569b970c\", table \"dbo.departments\", column 'id'.",
      "stack": "QueryFailedError: Error: The UPDATE statement conflicted with the FOREIGN KEY constraint \"FK_ece1d9122a8f3334815ddba096e\". The conflict occurred in database \"hr_orgaudience_test_c6f3d1f5569b970c\", table \"dbo.departments\", column 'id'.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A06: moved unit or parent and missing team fail closed in live audience reads",
      "ms": 219.2237,
      "pass": false,
      "error": "Error: The UPDATE statement conflicted with the FOREIGN KEY constraint \"FK_ece1d9122a8f3334815ddba096e\". The conflict occurred in database \"hr_orgaudience_test_c6f3d1f5569b970c\", table \"dbo.departments\", column 'id'.",
      "cause": "Error: The UPDATE statement conflicted with the FOREIGN KEY constraint \"FK_ece1d9122a8f3334815ddba096e\". The conflict occurred in database \"hr_orgaudience_test_c6f3d1f5569b970c\", table \"dbo.departments\", column 'id'.",
      "stack": "QueryFailedError: Error: The UPDATE statement conflicted with the FOREIGN KEY constraint \"FK_ece1d9122a8f3334815ddba096e\". The conflict occurred in database \"hr_orgaudience_test_c6f3d1f5569b970c\", table \"dbo.departments\", column 'id'.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"P7B-A05\",\"shapes\":5,\"writesRejected\":15}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_c6f3d1f5569b970c",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 17606.4032"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_c6f3d1f5569b970c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_c6f3d1f5569b970c\"}\n"
  ]
}
