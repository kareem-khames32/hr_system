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
    "duration_ms": 6500.1389
  },
  "results": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 4061.6559,
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
      "ms": 4061.6559,
      "pass": false,
      "error": "Inbox disclosed current foreign title",
      "cause": "Inbox disclosed current foreign title",
      "stack": "AssertionError [ERR_ASSERTION]: Inbox disclosed current foreign title\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:181:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"inbox-after-transfer\",\"baseline\":true,\"employeeStatus\":404,\"detailHidden\":false,\"detailTitle\":\"NEW FOREIGN JOB R5\",\"inboxTitle\":\"NEW FOREIGN JOB R5\",\"oldTitle\":\"OLD JOB R5\",\"newTitle\":\"NEW FOREIGN JOB R5\",\"transferViaApi\":true}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6500.1389"
  ],
  "stdout": [
    "CR5_BASELINE {\"commit\":\"ce9ee15\",\"productSourcesInMemory\":5,\"productFilesWritten\":0}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5boundaries_test_21d58834e30fd3bd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5boundaries_test_21d58834e30fd3bd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5boundaries_test_21d58834e30fd3bd\"}\n"
  ]
}
