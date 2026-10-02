module.exports = {
  "selected": [
    "codex-review-round23-exemptions"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 2,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 9937.5379
  },
  "results": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 7424.3856,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'getRepository')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'getRepository')\n    at repo (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:37:53)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:189:27)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:187:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)"
    },
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 1.8991,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'getRepository')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'getRepository')\n    at repo (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:37:53)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:189:27)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:187:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 7424.3856,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'getRepository')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'getRepository')\n    at repo (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:37:53)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:189:27)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:187:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)"
    },
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 1.8991,
      "pass": false,
      "error": "failed running before hook",
      "cause": "Cannot read properties of undefined (reading 'getRepository')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'getRepository')\n    at repo (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:37:53)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:189:27)\n    at TestHook.runInAsyncScope (node:async_hooks:214:14)\n    at TestHook.run (node:internal/test_runner/test:1106:25)\n    at TestHook.run (node:internal/test_runner/test:1427:18)\n    at TestHook.run (node:internal/util:584:20)\n    at Test.createHook (node:internal/test_runner/test:930:33)\n    at node:internal/test_runner/harness:397:12\n    at Object.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:187:1)\n    at Module._compile (node:internal/modules/cjs/loader:1761:14)"
    }
  ],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9937.5379"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_exemptions_test_d8d46b4e0a44cc13\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_exemptions_test_d8d46b4e0a44cc13\"}\n"
  ]
}
