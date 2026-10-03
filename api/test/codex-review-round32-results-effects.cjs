module.exports = {
  "selected": [
    "codex-review-round32-holiday-effects"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 8279.7021
  },
  "results": [
    {
      "file": "codex-review-round32-holiday-effects.integration.cjs",
      "name": "CR32 update returns ordinary detail, recomputes covered overtime and rebuilds only the unreserved holiday credit",
      "ms": 5770.1835,
      "pass": false,
      "error": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "cause": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round32-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round32-holiday-effects.integration.cjs:23:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round32-holiday-effects.integration.cjs",
      "name": "CR32 update returns ordinary detail, recomputes covered overtime and rebuilds only the unreserved holiday credit",
      "ms": 5770.1835,
      "pass": false,
      "error": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "cause": "POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/calculate: 400 {\"code\":\"PAYRUN-STATE-001\",\"message\":\"لا يمكن احتساب المسودة والمسير في حالة CALCULATED؛ المسير المصروف لا يُفتح لإعادة الحساب\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round32-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round32-holiday-effects.integration.cjs:23:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8279.7021"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r32_holiday_effects_test_661a2d60c19ecf5e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r32_holiday_effects_test_661a2d60c19ecf5e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r32_holiday_effects_test_661a2d60c19ecf5e\"}\n"
  ]
}
