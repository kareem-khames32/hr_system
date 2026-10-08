module.exports = {
  "selected": [
    "codex-review-p5d-calendar-pool"
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
    "duration_ms": 21514.908
  },
  "results": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 15549.5805,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 2.0755,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 0.0467,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 0.047,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 0.0389,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 15549.5805,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 2.0755,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 0.0467,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 0.047,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 0.0389,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'get')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'get')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:112:17)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:111:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)\n    at node:internal/modules/cjs/loader:1893:10"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_expense_reports_test_d67bbc2981f1d378 is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 0",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 21514.908"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_d67bbc2981f1d378\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_d67bbc2981f1d378\"}\n"
  ]
}
