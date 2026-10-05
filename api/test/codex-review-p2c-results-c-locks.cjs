module.exports = {
  "selected": [
    "codex-review-p2c-live-locks"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 15412.7863
  },
  "results": [
    {
      "file": "codex-review-p2c-live-locks.integration.cjs",
      "name": "P2C C real queue retries finance lock timeout without writes or recursive jobs; succeeds on retry",
      "ms": 7992.3883,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-live-locks.integration.cjs",
      "name": "P2C C worker first: real approval waits on same lock and completes after worker, without changing net",
      "ms": 1686.4823,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-live-locks.integration.cjs",
      "name": "P2C C busy refresh must report unresolved work instead of remaining zero",
      "ms": 2606.8802,
      "pass": false,
      "error": "Unresolved busy employee must remain pending in the refresh progress response\n\n0 !== 1\n",
      "cause": "Unresolved busy employee must remain pending in the refresh progress response\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Unresolved busy employee must remain pending in the refresh progress response\n\n0 !== 1\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-live-locks.integration.cjs:46:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2c-live-locks.integration.cjs",
      "name": "P2C C busy refresh must report unresolved work instead of remaining zero",
      "ms": 2606.8802,
      "pass": false,
      "error": "Unresolved busy employee must remain pending in the refresh progress response\n\n0 !== 1\n",
      "cause": "Unresolved busy employee must remain pending in the refresh progress response\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Unresolved busy employee must remain pending in the refresh progress response\n\n0 !== 1\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-live-locks.integration.cjs:46:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"actual-queue-timeout\",\"first\":{\"recovered\":0,\"dispatched\":0,\"done\":0,\"retried\":1,\"dead\":0},\"second\":{\"recovered\":0,\"dispatched\":0,\"done\":1,\"retried\":0,\"dead\":0},\"dirtyAfter\":0,\"noRecursiveJobs\":true}",
    "{\"case\":\"worker-first-real-approval\",\"approvalStatus\":201,\"totalNet\":6000,\"closedRowsUnchanged\":true}",
    "{\"case\":\"busy-refresh-progress\",\"computed\":0,\"remaining\":0,\"pending\":1,\"retryComputed\":12,\"retryComplete\":true}",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15412.7863"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_live_locks_test_9825e8548fdc70db\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_live_locks_test_9825e8548fdc70db\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_live_locks_test_9825e8548fdc70db\"}\n"
  ]
}
