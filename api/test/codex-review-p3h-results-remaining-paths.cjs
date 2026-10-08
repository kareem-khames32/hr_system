module.exports = {
  "selected": [
    "codex-review-p3h-unseeded-role",
    "codex-review-p3h-domain-rebinding"
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
    "duration_ms": 7611.9147
  },
  "results": [
    {
      "file": "codex-review-p3h-unseeded-role.integration.cjs",
      "name": "P3H-U-preset: a missing role row must stay pinned after the final roleStamp read",
      "ms": 4987.5038,
      "pass": false,
      "error": "role creation after the final absent-row read must not bypass the assignment judgement",
      "cause": "role creation after the final absent-row read must not bypass the assignment judgement",
      "stack": "AssertionError [ERR_ASSERTION]: role creation after the final absent-row read must not bypass the assignment judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-unseeded-role.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3h-domain-rebinding.integration.cjs",
      "name": "P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
      "ms": 5035.9876,
      "pass": false,
      "error": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "cause": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "stack": "AssertionError [ERR_ASSERTION]: directory identity matched to employee A must not enter as employee B through the obsolete sync plan\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-domain-rebinding.integration.cjs:23:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3h-unseeded-role.integration.cjs",
      "name": "P3H-U-preset: a missing role row must stay pinned after the final roleStamp read",
      "ms": 4987.5038,
      "pass": false,
      "error": "role creation after the final absent-row read must not bypass the assignment judgement",
      "cause": "role creation after the final absent-row read must not bypass the assignment judgement",
      "stack": "AssertionError [ERR_ASSERTION]: role creation after the final absent-row read must not bypass the assignment judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-unseeded-role.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3h-domain-rebinding.integration.cjs",
      "name": "P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
      "ms": 5035.9876,
      "pass": false,
      "error": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "cause": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "stack": "AssertionError [ERR_ASSERTION]: directory identity matched to employee A must not enter as employee B through the obsolete sync plan\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-domain-rebinding.integration.cjs:23:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 7611.9147"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_unseeded_role_test_334153ac33efef3f\"}\n",
    "REVIEW_MEASURE {\"case\":\"unseeded-role-stamp\",\"insertWaited\":false,\"insert\":201,\"newJudgement\":403,\"assignment\":200,\"administrativePermissionGranted\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_unseeded_role_test_334153ac33efef3f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_unseeded_role_test_334153ac33efef3f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_domain_rebinding_test_97347133e81273f0\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-link-after-rebinding\",\"sync\":200,\"currentPreviewCreatesSeparateAccount\":true,\"staleGuidAttached\":true,\"login\":201,\"loggedInAsOtherEmployee\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_domain_rebinding_test_97347133e81273f0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_domain_rebinding_test_97347133e81273f0\"}\n"
  ]
}
