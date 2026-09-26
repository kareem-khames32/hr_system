module.exports = {
  "selected": [
    "codex-review-round5-boundaries"
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
    "duration_ms": 6388.1663
  },
  "results": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 4155.41,
      "pass": false,
      "error": "Inbox disclosed current foreign title",
      "cause": "Inbox disclosed current foreign title",
      "stack": "AssertionError [ERR_ASSERTION]: Inbox disclosed current foreign title\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:181:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 4155.41,
      "pass": false,
      "error": "Inbox disclosed current foreign title",
      "cause": "Inbox disclosed current foreign title",
      "stack": "AssertionError [ERR_ASSERTION]: Inbox disclosed current foreign title\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:181:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"inbox-after-transfer\",\"baseline\":false,\"employeeStatus\":404,\"detailHidden\":true,\"detailTitle\":null,\"inboxTitle\":\"NEW FOREIGN JOB R5\",\"oldTitle\":\"OLD JOB R5\",\"newTitle\":\"NEW FOREIGN JOB R5\",\"transferViaApi\":true}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6388.1663"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5boundaries_test_4a516d91d31a70c9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5boundaries_test_4a516d91d31a70c9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5boundaries_test_4a516d91d31a70c9\"}\n"
  ]
}
