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
    "duration_ms": 9485.9009
  },
  "results": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 7071.8938,
      "pass": false,
      "error": "Foreign run IDs must be hidden in events as well as obligation fields\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'CARRY_FORWARD'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'CARRY_SUSPENDED'\n    }\n  ]\n",
      "cause": "Foreign run IDs must be hidden in events as well as obligation fields\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'CARRY_FORWARD'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'CARRY_SUSPENDED'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign run IDs must be hidden in events as well as obligation fields\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'CARRY_FORWARD'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'CARRY_SUSPENDED'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:50:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 both obligation reservation guards reject without foreign run numbers or writes",
      "ms": 197.5214,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 7071.8938,
      "pass": false,
      "error": "Foreign run IDs must be hidden in events as well as obligation fields\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'CARRY_FORWARD'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'CARRY_SUSPENDED'\n    }\n  ]\n",
      "cause": "Foreign run IDs must be hidden in events as well as obligation fields\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'CARRY_FORWARD'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'CARRY_SUSPENDED'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign run IDs must be hidden in events as well as obligation fields\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'CARRY_FORWARD'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'CARRY_SUSPENDED'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:50:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"carry-event-run-reference\",\"directRunStatus\":403,\"requestDetailStatus\":200,\"branchEvents\":[{\"type\":\"CARRY_FORWARD\",\"runId\":1},{\"type\":\"CARRY_SUSPENDED\",\"runId\":2}],\"companyEvents\":[{\"type\":\"CARRY_FORWARD\",\"runId\":1},{\"type\":\"CARRY_SUSPENDED\",\"runId\":2}],\"actionResponseEvents\":[{\"type\":\"CARRY_FORWARD\",\"runId\":1},{\"type\":\"CARRY_SUSPENDED\",\"runId\":2}],\"ledgerReferencesHidden\":true,\"pastPeriodRejectedWithoutWrite\":true,\"paid\":2000,\"remaining\":500,\"storedEvidenceUnchangedByReads\":true}",
    "{\"case\":\"reservation-guards\",\"guardCount\":2,\"status\":409,\"code\":\"PAYRUN-OBLIGATION-RESERVED\",\"foreignRunReferenceAbsent\":true,\"ledgerUnchanged\":true}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9485.9009"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_boundaries_test_bee9b21349945324\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_boundaries_test_bee9b21349945324\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_boundaries_test_bee9b21349945324\"}\n"
  ]
}
