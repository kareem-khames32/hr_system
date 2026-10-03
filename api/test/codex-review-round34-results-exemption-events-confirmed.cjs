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
    "duration_ms": 8329.2923
  },
  "results": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 5313.6507,
      "pass": false,
      "error": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "cause": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 774.9009,
      "pass": false,
      "error": "POST /payroll/runs/2/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "cause": "POST /payroll/runs/2/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/2/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 5313.6507,
      "pass": false,
      "error": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "cause": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 774.9009,
      "pass": false,
      "error": "POST /payroll/runs/2/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "cause": "POST /payroll/runs/2/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/2/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:23:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 8329.2923"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_exemption_events_test_f0c2da6fa24daa09\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_exemption_events_test_f0c2da6fa24daa09\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_exemption_events_test_f0c2da6fa24daa09\"}\n"
  ]
}
