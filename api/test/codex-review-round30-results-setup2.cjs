module.exports = {
  "selected": [
    "codex-review-round30-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 1,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 10621.5671
  },
  "results": [
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation create holds employee lock until save, transfer waits",
      "ms": 4733.435,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation cancel holds employee lock until save, transfer waits",
      "ms": 407.6652,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 cancellation rereads APPLIED after a real payroll is paid during its early scope check",
      "ms": 1638.3906,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "cause": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nNaN !== 9321.09\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:43:96)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 employees allowance targets are reread after actual transfer; named group is atomic",
      "ms": 246.0055,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 teams allowance targets are reread after actual transfer; named group is atomic",
      "ms": 333.5572,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 waiver named target rejects real transfer without any partial save",
      "ms": 141.9765,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-create named target rejects real transfer without any partial save",
      "ms": 180.0454,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-update named target rejects real transfer without any partial save",
      "ms": 241.2065,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 cancellation rereads APPLIED after a real payroll is paid during its early scope check",
      "ms": 1638.3906,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "cause": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nNaN !== 9321.09\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:43:96)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"financial-write-first\",\"action\":\"create\",\"exclusiveLock\":true,\"write\":201,\"transfer\":200,\"afterTransfer\":403,\"amount\":321.09}",
    "{\"case\":\"financial-write-first\",\"action\":\"cancel\",\"exclusiveLock\":true,\"write\":201,\"transfer\":200,\"afterTransfer\":403,\"amount\":321.09}",
    "{\"case\":\"allowance-target-recheck\",\"level\":\"employees\",\"transfer\":200,\"status\":400,\"employees\":[],\"remainingExpected\":0,\"total\":0}",
    "{\"case\":\"allowance-target-recheck\",\"level\":\"teams\",\"transfer\":200,\"status\":201,\"employees\":[7],\"remainingExpected\":1,\"total\":150.25}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"waiver\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"holiday-create\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"holiday-update\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "tests 8",
    "suites 0",
    "pass 7",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10621.5671"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r30_independent_test_ed9f07b7f9371503\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r30_independent_test_ed9f07b7f9371503\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r30_independent_test_ed9f07b7f9371503\"}\n"
  ]
}
