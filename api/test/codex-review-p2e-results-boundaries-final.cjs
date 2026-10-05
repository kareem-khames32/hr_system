module.exports = {
  "selected": [
    "codex-review-p2e-boundaries"
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
    "duration_ms": 10320.8776
  },
  "results": [
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E control: current approver receives only metadata, branch change before send suppresses it",
      "ms": 5411.7443,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
      "ms": 466.3257,
      "pass": false,
      "error": "Error: Cannot insert duplicate key row in object 'dbo.payroll_runs' with unique index 'UX_payroll_run_period_name'. The duplicate key value is (2026-09, مسير مصطنع لفحص الإشعار).",
      "cause": "Error: Cannot insert duplicate key row in object 'dbo.payroll_runs' with unique index 'UX_payroll_run_period_name'. The duplicate key value is (2026-09, مسير مصطنع لفحص الإشعار).",
      "stack": "QueryFailedError: Error: Cannot insert duplicate key row in object 'dbo.payroll_runs' with unique index 'UX_payroll_run_period_name'. The duplicate key value is (2026-09, مسير مصطنع لفحص الإشعار).\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
      "ms": 399.745,
      "pass": false,
      "error": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "cause": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:97:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E digest observes quiet hours and resumes after they end",
      "ms": 281.5516,
      "pass": false,
      "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "cause": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Digest must respect quiet hours like immediate email\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:111:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
      "ms": 487.8487,
      "pass": false,
      "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "cause": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:127:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
      "ms": 542.088,
      "pass": false,
      "error": "Confidentiality must not remove stale-return checks",
      "cause": "Confidentiality must not remove stale-return checks",
      "stack": "AssertionError [ERR_ASSERTION]: Confidentiality must not remove stale-return checks\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:142:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
      "ms": 466.3257,
      "pass": false,
      "error": "Error: Cannot insert duplicate key row in object 'dbo.payroll_runs' with unique index 'UX_payroll_run_period_name'. The duplicate key value is (2026-09, مسير مصطنع لفحص الإشعار).",
      "cause": "Error: Cannot insert duplicate key row in object 'dbo.payroll_runs' with unique index 'UX_payroll_run_period_name'. The duplicate key value is (2026-09, مسير مصطنع لفحص الإشعار).",
      "stack": "QueryFailedError: Error: Cannot insert duplicate key row in object 'dbo.payroll_runs' with unique index 'UX_payroll_run_period_name'. The duplicate key value is (2026-09, مسير مصطنع لفحص الإشعار).\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
      "ms": 399.745,
      "pass": false,
      "error": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "cause": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:97:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E digest observes quiet hours and resumes after they end",
      "ms": 281.5516,
      "pass": false,
      "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "cause": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Digest must respect quiet hours like immediate email\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:111:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
      "ms": 487.8487,
      "pass": false,
      "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "cause": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:127:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
      "ms": 542.088,
      "pass": false,
      "error": "Confidentiality must not remove stale-return checks",
      "cause": "Confidentiality must not remove stale-return checks",
      "stack": "AssertionError [ERR_ASSERTION]: Confidentiality must not remove stale-return checks\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:142:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"current-account-scope-control\",\"sent\":1,\"afterBranchChange\":\"SKIPPED\"}",
    "{\"case\":\"relinked-owner-control\",\"requestStatus\":200}",
    "{\"case\":\"relinked-noncreator-account\",\"requestStatus\":404,\"sent\":1,\"containsOldType\":true,\"delivery\":\"SENT\"}",
    "{\"case\":\"quiet-digest\",\"sentInQuiet\":1,\"quietStatus\":\"SENT\",\"resumed\":0,\"sentTotal\":1}",
    "{\"case\":\"staggered-delivery-claim\",\"overlapping\":2,\"sent\":2,\"attempts\":2,\"status\":\"SENT\"}",
    "{\"case\":\"confidential-return-staleness\",\"results\":[{\"secret\":false,\"event\":\"request.returned\",\"sent\":0,\"status\":\"SKIPPED\"},{\"secret\":true,\"event\":\"request.confidential\",\"sent\":1,\"status\":\"SENT\"}]}",
    "tests 6",
    "suites 0",
    "pass 1",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10320.8776"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2e_boundaries_test_c46a05e2d83fdee9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2e_boundaries_test_c46a05e2d83fdee9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2e_boundaries_test_c46a05e2d83fdee9\"}\n"
  ]
}
