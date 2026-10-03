module.exports = {
  "selected": [
    "codex-review-round34-independent"
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
    "duration_ms": 16570.5971
  },
  "results": [
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 bonus: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 10953.1837,
      "pass": false,
      "error": "GET /bonuses/1: 404 {\"code\":\"BONUS_NOT_FOUND\",\"message\":\"طلب المكافأة غير موجود\"}",
      "cause": "GET /bonuses/1: 404 {\"code\":\"BONUS_NOT_FOUND\",\"message\":\"طلب المكافأة غير موجود\"}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /bonuses/1: 404 {\"code\":\"BONUS_NOT_FOUND\",\"message\":\"طلب المكافأة غير موجود\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-independent.integration.cjs:30:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 deduction: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 2470.6453,
      "pass": false,
      "error": "GET /deductions/1: 404 {\"code\":\"DEDUCTION_NOT_FOUND\",\"message\":\"طلب الخصم غير موجود\"}",
      "cause": "GET /deductions/1: 404 {\"code\":\"DEDUCTION_NOT_FOUND\",\"message\":\"طلب الخصم غير موجود\"}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /deductions/1: 404 {\"code\":\"DEDUCTION_NOT_FOUND\",\"message\":\"طلب الخصم غير موجود\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-independent.integration.cjs:30:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 bonus: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 10953.1837,
      "pass": false,
      "error": "GET /bonuses/1: 404 {\"code\":\"BONUS_NOT_FOUND\",\"message\":\"طلب المكافأة غير موجود\"}",
      "cause": "GET /bonuses/1: 404 {\"code\":\"BONUS_NOT_FOUND\",\"message\":\"طلب المكافأة غير موجود\"}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /bonuses/1: 404 {\"code\":\"BONUS_NOT_FOUND\",\"message\":\"طلب المكافأة غير موجود\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-independent.integration.cjs:30:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 deduction: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 2470.6453,
      "pass": false,
      "error": "GET /deductions/1: 404 {\"code\":\"DEDUCTION_NOT_FOUND\",\"message\":\"طلب الخصم غير موجود\"}",
      "cause": "GET /deductions/1: 404 {\"code\":\"DEDUCTION_NOT_FOUND\",\"message\":\"طلب الخصم غير موجود\"}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /deductions/1: 404 {\"code\":\"DEDUCTION_NOT_FOUND\",\"message\":\"طلب الخصم غير موجود\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-independent.integration.cjs:30:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 16570.5971"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_independent_test_fa16b4e268727c50\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_independent_test_fa16b4e268727c50\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_independent_test_fa16b4e268727c50\"}\n"
  ]
}
