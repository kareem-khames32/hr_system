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
    "duration_ms": 7566.4304
  },
  "results": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 4575.756,
      "pass": false,
      "error": "POST /payroll/runs/1/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "cause": "POST /payroll/runs/1/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 809.239,
      "pass": false,
      "error": "POST /payroll/runs/2/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "cause": "POST /payroll/runs/2/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/2/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 4575.756,
      "pass": false,
      "error": "POST /payroll/runs/1/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "cause": "POST /payroll/runs/1/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 809.239,
      "pass": false,
      "error": "POST /payroll/runs/2/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "cause": "POST /payroll/runs/2/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/2/recalculate: 400 {\"code\":\"PAYRUN-REASON-001\",\"message\":\"اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 7566.4304"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_exemption_events_test_aa28c96858d72018\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_exemption_events_test_aa28c96858d72018\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_exemption_events_test_aa28c96858d72018\"}\n"
  ]
}
