module.exports = {
  "selected": [
    "codex-review-round34-exemption-events"
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
    "duration_ms": 9005.8296
  },
  "results": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 5469.308,
      "pass": false,
      "error": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTED'\n    }\n  ]\n",
      "cause": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTED'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTED'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:40:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 1326.5048,
      "pass": false,
      "error": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'DEFERRED_BY_EXEMPTION'\n    }\n  ]\n",
      "cause": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'DEFERRED_BY_EXEMPTION'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'DEFERRED_BY_EXEMPTION'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:40:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 5469.308,
      "pass": false,
      "error": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTED'\n    }\n  ]\n",
      "cause": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTED'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTED'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:40:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 1326.5048,
      "pass": false,
      "error": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'DEFERRED_BY_EXEMPTION'\n    }\n  ]\n",
      "cause": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'DEFERRED_BY_EXEMPTION'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'DEFERRED_BY_EXEMPTION'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:40:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"exemption-event-run-reference\",\"disposition\":\"DROP\",\"directRunStatus\":403,\"detailStatus\":200,\"branchEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":1},{\"type\":\"EXEMPTED\",\"runId\":1}],\"companyEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":1},{\"type\":\"EXEMPTED\",\"runId\":1}],\"exemptionAmount\":123.45,\"beforeNet\":8876.55,\"afterNet\":9000,\"storedEvidenceUnchangedByRead\":true}",
    "{\"case\":\"exemption-event-run-reference\",\"disposition\":\"DEFER_ONE_PERIOD\",\"directRunStatus\":403,\"detailStatus\":200,\"branchEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":2},{\"type\":\"DEFERRED_BY_EXEMPTION\",\"runId\":2}],\"companyEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":2},{\"type\":\"DEFERRED_BY_EXEMPTION\",\"runId\":2}],\"exemptionAmount\":123.45,\"beforeNet\":8876.55,\"afterNet\":9000,\"storedEvidenceUnchangedByRead\":true}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9005.8296"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_exemption_events_test_8b55740f7aafa722\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_exemption_events_test_8b55740f7aafa722\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_exemption_events_test_8b55740f7aafa722\"}\n"
  ]
}
