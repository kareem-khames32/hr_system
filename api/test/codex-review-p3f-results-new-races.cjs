module.exports = {
  "selected": [
    "codex-review-p3f-session-boundary",
    "codex-review-p3f-version-writers"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 3,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 8477.4868
  },
  "results": [
    {
      "file": "codex-review-p3f-session-boundary.integration.cjs",
      "name": "P3F-S-before-state: email activation on each side of the post-open factor read",
      "ms": 5164.1256,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-session-boundary.integration.cjs",
      "name": "P3F-S-after-state: email activation on each side of the post-open factor read",
      "ms": 442.5626,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-session-boundary.integration.cjs",
      "name": "P3F-S-password: password-only login cannot open a new full session after TOTP activation committed",
      "ms": 266.7908,
      "pass": false,
      "error": "a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n",
      "cause": "a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-session-boundary.integration.cjs:47:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-role: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 5087.4126,
      "pass": false,
      "error": "a stale reset cannot pass after promotion and ordinary account editing",
      "cause": "a stale reset cannot pass after promotion and ordinary account editing",
      "stack": "AssertionError [ERR_ASSERTION]: a stale reset cannot pass after promotion and ordinary account editing\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:31:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-override: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 325.9586,
      "pass": false,
      "error": "a stale reset cannot pass after promotion and ordinary account editing",
      "cause": "a stale reset cannot pass after promotion and ordinary account editing",
      "stack": "AssertionError [ERR_ASSERTION]: a stale reset cannot pass after promotion and ordinary account editing\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:31:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3f-session-boundary.integration.cjs",
      "name": "P3F-S-password: password-only login cannot open a new full session after TOTP activation committed",
      "ms": 266.7908,
      "pass": false,
      "error": "a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n",
      "cause": "a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-session-boundary.integration.cjs:47:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-role: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 5087.4126,
      "pass": false,
      "error": "a stale reset cannot pass after promotion and ordinary account editing",
      "cause": "a stale reset cannot pass after promotion and ordinary account editing",
      "stack": "AssertionError [ERR_ASSERTION]: a stale reset cannot pass after promotion and ordinary account editing\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:31:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-override: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 325.9586,
      "pass": false,
      "error": "a stale reset cannot pass after promotion and ordinary account editing",
      "cause": "a stale reset cannot pass after promotion and ordinary account editing",
      "stack": "AssertionError [ERR_ASSERTION]: a stale reset cannot pass after promotion and ordinary account editing\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:31:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 2",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8477.4868"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_session_boundary_test_ab4b034a1b6b9ae0\"}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"before-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":401,\"fullSession\":null,\"rowRevoked\":true}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"after-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":200,\"fullSession\":200,\"rowRevoked\":false}\n",
    "REVIEW_MEASURE {\"case\":\"password-activation-race\",\"activation\":200,\"login\":201,\"newRowAfterActivation\":true,\"rowRevoked\":false,\"issuerSawEnrolled\":true,\"fullSession\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_session_boundary_test_ab4b034a1b6b9ae0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_session_boundary_test_ab4b034a1b6b9ae0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_version_writers_test_11f684aed013d529\"}\n",
    "REVIEW_MEASURE {\"case\":\"version-overwritten-role\",\"initialVersion\":0,\"promotedVersion\":1,\"afterOrdinaryEdit\":0,\"currentReset\":403,\"racingReset\":200,\"enabledAfter\":false}\n",
    "REVIEW_MEASURE {\"case\":\"version-overwritten-override\",\"initialVersion\":0,\"promotedVersion\":1,\"afterOrdinaryEdit\":0,\"currentReset\":403,\"racingReset\":200,\"enabledAfter\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_version_writers_test_11f684aed013d529\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_version_writers_test_11f684aed013d529\"}\n"
  ]
}
