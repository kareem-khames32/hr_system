module.exports = {
  "selected": [
    "codex-review-p3h-domain-rebinding"
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
    "duration_ms": 26401.8825
  },
  "results": [
    {
      "file": "codex-review-p3h-domain-rebinding.integration.cjs",
      "name": "P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
      "ms": 19383.6022,
      "pass": false,
      "error": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "cause": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "stack": "AssertionError [ERR_ASSERTION]: directory identity matched to employee A must not enter as employee B through the obsolete sync plan\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-domain-rebinding.integration.cjs:25:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3h-domain-rebinding.integration.cjs",
      "name": "P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
      "ms": 19383.6022,
      "pass": false,
      "error": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "cause": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "stack": "AssertionError [ERR_ASSERTION]: directory identity matched to employee A must not enter as employee B through the obsolete sync plan\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-domain-rebinding.integration.cjs:25:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 26401.8825"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_domain_rebinding_test_a6b1b2a89bafae4c\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-link-after-rebinding\",\"sync\":200,\"currentPreviewCreatesSeparateAccount\":true,\"staleGuidAttached\":true,\"login\":201,\"loggedInAsOtherEmployee\":true,\"guardedAccess\":200,\"guardedAsOtherEmployee\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_domain_rebinding_test_a6b1b2a89bafae4c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_domain_rebinding_test_a6b1b2a89bafae4c\"}\n"
  ]
}
