module.exports = {
  "selected": [
    "codex-review-p3g-version-writers",
    "codex-review-p3g-password-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 2,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 8634.2122
  },
  "results": [
    {
      "file": "codex-review-p3g-version-writers.integration.cjs",
      "name": "P3G-V-role: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 5276.6397,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-version-writers.integration.cjs",
      "name": "P3G-V-override: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 331.852,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-version-writers.integration.cjs",
      "name": "P3G-V-role-name: renaming a stale role cannot restore elevated permissions without moving the account version",
      "ms": 294.8878,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-password-race.integration.cjs",
      "name": "P3G-P-role: changing a password must not reissue revoked authority with the current version",
      "ms": 5336.5057,
      "pass": false,
      "error": "new password session must not restore authority revoked before its row was opened",
      "cause": "new password session must not restore authority revoked before its row was opened",
      "stack": "AssertionError [ERR_ASSERTION]: new password session must not restore authority revoked before its row was opened\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-password-race.integration.cjs:32:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3g-password-race.integration.cjs",
      "name": "P3G-P-legacy-grant: changing a password must not reissue revoked authority with the current version",
      "ms": 381.5497,
      "pass": false,
      "error": "new password session must not restore authority revoked before its row was opened",
      "cause": "new password session must not restore authority revoked before its row was opened",
      "stack": "AssertionError [ERR_ASSERTION]: new password session must not restore authority revoked before its row was opened\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-password-race.integration.cjs:32:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3g-password-race.integration.cjs",
      "name": "P3G-P-role-bundle: changing a password must not reissue revoked authority with the current version",
      "ms": 367.948,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3g-password-race.integration.cjs",
      "name": "P3G-P-role: changing a password must not reissue revoked authority with the current version",
      "ms": 5336.5057,
      "pass": false,
      "error": "new password session must not restore authority revoked before its row was opened",
      "cause": "new password session must not restore authority revoked before its row was opened",
      "stack": "AssertionError [ERR_ASSERTION]: new password session must not restore authority revoked before its row was opened\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-password-race.integration.cjs:32:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3g-password-race.integration.cjs",
      "name": "P3G-P-legacy-grant: changing a password must not reissue revoked authority with the current version",
      "ms": 381.5497,
      "pass": false,
      "error": "new password session must not restore authority revoked before its row was opened",
      "cause": "new password session must not restore authority revoked before its row was opened",
      "stack": "AssertionError [ERR_ASSERTION]: new password session must not restore authority revoked before its row was opened\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-password-race.integration.cjs:32:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 6",
    "suites 0",
    "pass 4",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8634.2122"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_version_writers_test_69369a7281d74152\"}\n",
    "REVIEW_MEASURE {\"case\":\"version-overwritten-role\",\"initialVersion\":0,\"promotedVersion\":1,\"afterOrdinaryEdit\":1,\"currentReset\":403,\"racingReset\":409,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"version-overwritten-override\",\"initialVersion\":0,\"promotedVersion\":1,\"afterOrdinaryEdit\":1,\"currentReset\":403,\"racingReset\":409,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"stale-role-rename\",\"rename\":409,\"versionBeforeRestore\":1,\"versionAfterRestore\":1,\"administrativePermissionRestored\":false,\"racingReset\":200,\"enabledAfter\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_version_writers_test_69369a7281d74152\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_version_writers_test_69369a7281d74152\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_password_race_test_79f524495b753abc\"}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"super_admin\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":200}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"legacy-grant\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"employee\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":200}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role-bundle\",\"changePassword\":200,\"dbRole\":\"p3g_password_role_2\",\"responseRole\":\"p3g_password_role_2\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_password_race_test_79f524495b753abc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_password_race_test_79f524495b753abc\"}\n"
  ]
}
