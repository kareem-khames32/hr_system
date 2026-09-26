module.exports = {
  "selected": [
    "codex-review-round10-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 5,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 22919.7868
  },
  "results": [
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 skip-level uses the same team then department fallback and routes confidential requests only to the resolved second manager",
      "ms": 14526.3144,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 top-step deduplication works when the removed step is first and the surviving named step is second",
      "ms": 31.8539,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 three-person manager cycle created through employee API must stop skip-level submission",
      "ms": 0.2641,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 executive parent does not expose its fields to branch B or extend its holiday and payroll scope",
      "ms": 0.1057,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 simultaneous linking and executive reassignment cannot leave a foreign child under an ordinary parent",
      "ms": 0.139,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 skip-level uses the same team then department fallback and routes confidential requests only to the resolved second manager",
      "ms": 14526.3144,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 top-step deduplication works when the removed step is first and the surviving named step is second",
      "ms": 31.8539,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 three-person manager cycle created through employee API must stop skip-level submission",
      "ms": 0.2641,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 executive parent does not expose its fields to branch B or extend its holiday and payroll scope",
      "ms": 0.1057,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 simultaneous linking and executive reassignment cannot leave a foreign child under an ordinary parent",
      "ms": 0.139,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 0",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22919.7868"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r10independent_test_a3d20b6bc56a0308\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r10independent_test_a3d20b6bc56a0308\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r10independent_test_a3d20b6bc56a0308\"}\n"
  ]
}
