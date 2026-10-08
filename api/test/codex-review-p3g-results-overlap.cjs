module.exports = {
  "selected": [
    "codex-review-p3g-account-role-concurrency"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 3,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 7612.983
  },
  "results": [
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-account: overlapping account and role transactions finish without a lock cycle",
      "ms": 4832.1086,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:22:99)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-role: overlapping account and role transactions finish without a lock cycle",
      "ms": 95.8224,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:22:99)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 150.8501,
      "pass": false,
      "error": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "cause": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a manager must not assign a role that acquired admin-only permissions after the original judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:40:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-account: overlapping account and role transactions finish without a lock cycle",
      "ms": 4832.1086,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:22:99)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-role: overlapping account and role transactions finish without a lock cycle",
      "ms": 95.8224,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:22:99)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 150.8501,
      "pass": false,
      "error": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "cause": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a manager must not assign a role that acquired admin-only permissions after the original judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:40:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7612.983"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_account_role_test_41dfaa07182e646f\"}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"account\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":1}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"role\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":1}\n",
    "REVIEW_MEASURE {\"case\":\"proposed-role-upgrade\",\"freshDecision\":403,\"pendingDecision\":200,\"versionBeforeAssignment\":0,\"versionAfterAssignment\":1,\"administrativePermissionGranted\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_account_role_test_41dfaa07182e646f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_account_role_test_41dfaa07182e646f\"}\n"
  ]
}
