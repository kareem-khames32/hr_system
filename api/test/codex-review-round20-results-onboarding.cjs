module.exports = {
  "selected": [
    "codex-review-round20-onboarding"
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
    "duration_ms": 35793.3179
  },
  "results": [
    {
      "file": "codex-review-round20-onboarding.integration.cjs",
      "name": "CR20 saving a system task note cannot restore DONE after a concurrent required document removal",
      "ms": 7290.497,
      "pass": false,
      "error": "A note edit must not complete a task with missing hiring documents\n\n'DONE' !== 'PENDING'\n",
      "cause": "A note edit must not complete a task with missing hiring documents\n\n'DONE' !== 'PENDING'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A note edit must not complete a task with missing hiring documents\n\n'DONE' !== 'PENDING'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\codex-review-round20-onboarding.integration.cjs:34:42)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round20-onboarding.integration.cjs",
      "name": "CR20 saving a system task note cannot restore DONE after a concurrent required document removal",
      "ms": 7290.497,
      "pass": false,
      "error": "A note edit must not complete a task with missing hiring documents\n\n'DONE' !== 'PENDING'\n",
      "cause": "A note edit must not complete a task with missing hiring documents\n\n'DONE' !== 'PENDING'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A note edit must not complete a task with missing hiring documents\n\n'DONE' !== 'PENDING'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\codex-review-round20-onboarding.integration.cjs:34:42)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"system-task-stale-save\",\"patchStatus\":200,\"statusAfterDocumentRemoval\":\"PENDING\",\"statusAfterNoteSave\":\"DONE\",\"returnedStatus\":\"DONE\",\"returnedProgress\":{\"requiredCount\":1,\"presentCount\":1,\"missing\":[]},\"statusAfterNextList\":\"PENDING\"}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 35793.3179"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r20_onboarding_test_3312ae1f827223dc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r20_onboarding_test_3312ae1f827223dc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r20_onboarding_test_3312ae1f827223dc\"}\n"
  ]
}
