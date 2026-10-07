module.exports = {
  "selected": [
    "codex-review-p3f-version-writers"
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
    "duration_ms": 26821.1337
  },
  "results": [
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-role-name: renaming a stale role cannot restore elevated permissions without moving the account version",
      "ms": 19460.4152,
      "pass": false,
      "error": "restoring a stronger role must invalidate an earlier reset judgement",
      "cause": "restoring a stronger role must invalidate an earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: restoring a stronger role must invalidate an earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-role-name: renaming a stale role cannot restore elevated permissions without moving the account version",
      "ms": 19460.4152,
      "pass": false,
      "error": "restoring a stronger role must invalidate an earlier reset judgement",
      "cause": "restoring a stronger role must invalidate an earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: restoring a stronger role must invalidate an earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 26821.1337"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_version_writers_test_f953976271ac57be\"}\n",
    "REVIEW_MEASURE {\"case\":\"stale-role-rename\",\"versionBeforeRestore\":1,\"versionAfterRestore\":1,\"administrativePermissionRestored\":true,\"currentReset\":403,\"racingReset\":200,\"enabledAfter\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_version_writers_test_f953976271ac57be\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_version_writers_test_f953976271ac57be\"}\n"
  ]
}
