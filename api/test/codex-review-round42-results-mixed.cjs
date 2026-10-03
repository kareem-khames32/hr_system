module.exports = {
  "selected": [
    "codex-review-round42-mixed"
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
    "duration_ms": 10508.9811
  },
  "results": [
    {
      "file": "codex-review-round42-mixed.integration.cjs",
      "name": "CR42 mixed reader: each employee keeps only authorized historical text and stable row-column keys across four line readers",
      "ms": 7500.6475,
      "pass": false,
      "error": "failed running before hook",
      "cause": "PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-mixed.integration.cjs:16:2)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round42-mixed.integration.cjs",
      "name": "CR42 query variants and client-supplied nested text do not become an employee payroll context",
      "ms": 0.4785,
      "pass": false,
      "error": "failed running before hook",
      "cause": "PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-mixed.integration.cjs:16:2)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round42-mixed.integration.cjs",
      "name": "CR42 mixed reader: each employee keeps only authorized historical text and stable row-column keys across four line readers",
      "ms": 7500.6475,
      "pass": false,
      "error": "failed running before hook",
      "cause": "PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-mixed.integration.cjs:16:2)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round42-mixed.integration.cjs",
      "name": "CR42 query variants and client-supplied nested text do not become an employee payroll context",
      "ms": 0.4785,
      "pass": false,
      "error": "failed running before hook",
      "cause": "PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round42-mixed.integration.cjs:16:2)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
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
    "duration_ms 10508.9811"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r42_mixed_test_81a6cf184faabdf7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r42_mixed_test_81a6cf184faabdf7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r42_mixed_test_81a6cf184faabdf7\"}\n"
  ]
}
