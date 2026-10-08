module.exports = {
  "selected": [
    "codex-review-p3g-account-role-concurrency"
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
    "duration_ms": 7202.9302
  },
  "results": [
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-account: overlapping account and role transactions finish without a lock cycle",
      "ms": 4551.9148,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-role: overlapping account and role transactions finish without a lock cycle",
      "ms": 97.8152,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 108.4062,
      "pass": false,
      "error": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "cause": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a manager must not assign a role that acquired admin-only permissions after the original judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:40:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 108.4062,
      "pass": false,
      "error": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "cause": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a manager must not assign a role that acquired admin-only permissions after the original judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:40:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7202.9302"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_account_role_test_6db4f043487e223e\"}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"account\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"role\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"proposed-role-upgrade\",\"freshDecision\":403,\"pendingDecision\":200,\"versionBeforeAssignment\":0,\"versionAfterAssignment\":1,\"administrativePermissionGranted\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_account_role_test_6db4f043487e223e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_account_role_test_6db4f043487e223e\"}\n"
  ]
}
