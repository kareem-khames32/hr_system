module.exports = {
  "selected": [
    "codex-review-p2c-precision",
    "codex-review-p2c-script-precision"
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
    "duration_ms": 11857.729
  },
  "results": [
    {
      "file": "codex-review-p2c-precision.integration.cjs",
      "name": "P2C D independent SQL insert/update returning: decimals, dates, Unicode MAX, bits, identity and transaction rollback",
      "ms": 5236.6524,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-script-precision.integration.cjs",
      "name": "P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)",
      "ms": 1429.4842,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p2c_script_test_aa4b70cb09460cbf.dbo.employees'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p2c_script_test_aa4b70cb09460cbf.dbo.employees'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p2c_script_test_aa4b70cb09460cbf.dbo.employees'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2c-script-precision.integration.cjs",
      "name": "P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)",
      "ms": 1429.4842,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p2c_script_test_aa4b70cb09460cbf.dbo.employees'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p2c_script_test_aa4b70cb09460cbf.dbo.employees'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p2c_script_test_aa4b70cb09460cbf.dbo.employees'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"precision-types\",\"bulk\":3,\"secondSaveExact\":true,\"updateOutput\":45.67,\"rollback\":true,\"patchIdempotent\":true}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11857.729"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_precision_test_cd6162468d29dce9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_precision_test_cd6162468d29dce9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_precision_test_cd6162468d29dce9\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_script_test_aa4b70cb09460cbf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_script_test_aa4b70cb09460cbf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_script_test_aa4b70cb09460cbf\"}\n"
  ]
}
