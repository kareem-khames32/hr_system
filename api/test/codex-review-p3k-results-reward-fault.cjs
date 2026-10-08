module.exports = {
  "selected": [
    "codex-review-p3k-rewards"
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
    "duration_ms": 10119.9348
  },
  "results": [
    {
      "file": "codex-review-p3k-rewards.integration.cjs",
      "name": "P3K-R01: post-commit bonus read failure releases reservation and retry creates another bonus",
      "ms": 6934.6843,
      "pass": false,
      "error": "{\"message\":\"قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-rewards.integration.cjs:59:53)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-rewards.integration.cjs:29:13)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3k-rewards.integration.cjs",
      "name": "P3K-R01: post-commit bonus read failure releases reservation and retry creates another bonus",
      "ms": 6934.6843,
      "pass": false,
      "error": "{\"message\":\"قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-rewards.integration.cjs:59:53)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-rewards.integration.cjs:29:13)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 10119.9348"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_rewards_test_4155874cd817c78a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_rewards_test_4155874cd817c78a\"}\n"
  ]
}
