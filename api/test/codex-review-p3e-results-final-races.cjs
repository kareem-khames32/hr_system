module.exports = {
  "selected": [
    "codex-review-p3e-auth-races",
    "codex-review-p3e-report-controls"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 6,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 9190.1851
  },
  "results": [
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 4949.9124,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 291.7136,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 271.595,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-1: activation while email verification is at factor check 1",
      "ms": 397.6176,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-2: activation while email verification is at factor check 2",
      "ms": 418.0999,
      "pass": false,
      "error": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "cause": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: activation completed before the old email verification issued its session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:55:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 274.7788,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-permission: final report identity rejects permission after real rendering",
      "ms": 4626.0099,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-disabled: final report identity rejects disabled after real rendering",
      "ms": 8.3101,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-churn: final report identity rejects churn after real rendering",
      "ms": 0.0674,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 4949.9124,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 291.7136,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-2: activation while email verification is at factor check 2",
      "ms": 418.0999,
      "pass": false,
      "error": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "cause": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: activation completed before the old email verification issued its session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:55:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-permission: final report identity rejects permission after real rendering",
      "ms": 4626.0099,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-disabled: final report identity rejects disabled after real rendering",
      "ms": 8.3101,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-churn: final report identity rejects churn after real rendering",
      "ms": 0.0674,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.",
      "stack": "QueryFailedError: Error: The incoming tabular data stream (TDS) remote procedure call (RPC) protocol stream is incorrect. Parameter 3 (\"@0\"): Data type 0xE7 has an invalid data length or metadata length.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "diagnostics": [
    "tests 9",
    "suites 0",
    "pass 3",
    "fail 6",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9190.1851"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3e_auth_races_test_151e844620d6c246\"}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-role\",\"currentDecision\":403,\"racingReset\":200,\"enabledAfter\":false,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-override\",\"currentDecision\":403,\"racingReset\":200,\"enabledAfter\":false,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-direct\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":1,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":false,\"issuerSawEnabled\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":2,\"activation\":200,\"verification\":200,\"fullSession\":200,\"newSessionAfterActivation\":true,\"issuerSawEnabled\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3e_auth_races_test_151e844620d6c246\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3e_auth_races_test_151e844620d6c246\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3e_reports_test_26bca264af14cc98\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3e_reports_test_26bca264af14cc98\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3e_reports_test_26bca264af14cc98\"}\n"
  ]
}
