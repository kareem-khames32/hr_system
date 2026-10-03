module.exports = {
  "selected": [
    "codex-review-round34-boundaries"
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
    "duration_ms": 8370.3156
  },
  "results": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 5977.2423,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'DEDUCTION_PERIOD_PAST'\n- 'DEDUCTION_PERIOD_CLOSED'\n                    ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'DEDUCTION_PERIOD_PAST'\n- 'DEDUCTION_PERIOD_CLOSED'\n                    ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'DEDUCTION_PERIOD_PAST'\n- 'DEDUCTION_PERIOD_CLOSED'\n                    ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:41:37)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 both obligation reservation guards reject without foreign run numbers or writes",
      "ms": 184.0299,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 5977.2423,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'DEDUCTION_PERIOD_PAST'\n- 'DEDUCTION_PERIOD_CLOSED'\n                    ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'DEDUCTION_PERIOD_PAST'\n- 'DEDUCTION_PERIOD_CLOSED'\n                    ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'DEDUCTION_PERIOD_PAST'\n- 'DEDUCTION_PERIOD_CLOSED'\n                    ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:41:37)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"reservation-guards\",\"guardCount\":2,\"status\":409,\"code\":\"PAYRUN-OBLIGATION-RESERVED\",\"foreignRunReferenceAbsent\":true,\"ledgerUnchanged\":true}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8370.3156"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_boundaries_test_eef42a5072d4f583\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_boundaries_test_eef42a5072d4f583\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_boundaries_test_eef42a5072d4f583\"}\n"
  ]
}
