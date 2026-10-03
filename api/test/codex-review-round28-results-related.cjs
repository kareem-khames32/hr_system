module.exports = {
  "selected": [
    "codex-review-round28-related-race"
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
    "duration_ms": 6121.5855
  },
  "results": [
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 3751.7327,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:11:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 77.8693,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:11:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 3751.7327,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:11:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 77.8693,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:11:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 6121.5855"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r28_related_test_4136e2c56a7ab42e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r28_related_test_4136e2c56a7ab42e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r28_related_test_4136e2c56a7ab42e\"}\n"
  ]
}
