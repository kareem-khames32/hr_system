module.exports = {
  "selected": [
    "codex-review-p3h-password-race",
    "codex-review-p3h-account-role-concurrency",
    "codex-review-p3h-version-writers",
    "codex-review-p3h-auth-races",
    "codex-review-p3h-session-boundary",
    "codex-review-p3h-factor-paths",
    "codex-review-p3h-auth-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 23,
      "failed": 0,
      "passed": 23,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 23,
      "suites": 0
    },
    "duration_ms": 32461.7858
  },
  "results": [
    {
      "file": "codex-review-p3h-password-race.integration.cjs",
      "name": "P3H-P-role: changing a password must not reissue revoked authority with the current version",
      "ms": 5134.8931,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-password-race.integration.cjs",
      "name": "P3H-P-legacy-grant: changing a password must not reissue revoked authority with the current version",
      "ms": 365.3462,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-password-race.integration.cjs",
      "name": "P3H-P-role-bundle: changing a password must not reissue revoked authority with the current version",
      "ms": 391.7616,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-account-role-concurrency.integration.cjs",
      "name": "P3H-C-account: overlapping account and role transactions finish without a lock cycle",
      "ms": 4915.4916,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-account-role-concurrency.integration.cjs",
      "name": "P3H-C-role: overlapping account and role transactions finish without a lock cycle",
      "ms": 125.2034,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-account-role-concurrency.integration.cjs",
      "name": "P3H-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 124.8087,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-version-writers.integration.cjs",
      "name": "P3H-V-role: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 5165.4494,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-version-writers.integration.cjs",
      "name": "P3H-V-override: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 316.1394,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-version-writers.integration.cjs",
      "name": "P3H-V-role-name: renaming a stale role cannot restore elevated permissions without moving the account version",
      "ms": 301.2163,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-races.integration.cjs",
      "name": "P3H-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 4962.592,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-races.integration.cjs",
      "name": "P3H-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 304.3369,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-races.integration.cjs",
      "name": "P3H-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 292.5258,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-races.integration.cjs",
      "name": "P3H-R-mail-1: activation while email verification is at factor check 1",
      "ms": 414.9304,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-races.integration.cjs",
      "name": "P3H-R-mail-2: activation while email verification is at factor check 2",
      "ms": 436.4522,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-races.integration.cjs",
      "name": "P3H-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 297.1153,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-session-boundary.integration.cjs",
      "name": "P3H-S-before-state: email activation on each side of the post-open factor read",
      "ms": 5300.5507,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-session-boundary.integration.cjs",
      "name": "P3H-S-after-state: email activation on each side of the post-open factor read",
      "ms": 470.4523,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-session-boundary.integration.cjs",
      "name": "P3H-S-password: password-only login cannot open a new full session after TOTP activation committed",
      "ms": 277.0869,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-factor-paths.integration.cjs",
      "name": "P3H-F-domain: domain login rechecks enrollment after opening the new session",
      "ms": 5006.5774,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-factor-paths.integration.cjs",
      "name": "P3H-F-client: a client cannot claim factorProven in a password login",
      "ms": 81.8908,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-independent.integration.cjs",
      "name": "P3H-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 4612.419,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-independent.integration.cjs",
      "name": "P3H-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 404.2149,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-auth-independent.integration.cjs",
      "name": "P3H-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 312.5177,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 23",
    "suites 0",
    "pass 23",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32461.7858"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_password_race_test_ddf16e6e5ef2fb96\"}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"employee\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"legacy-grant\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"employee\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role-bundle\",\"changePassword\":200,\"dbRole\":\"p3h_password_role_2\",\"responseRole\":\"p3h_password_role_2\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_password_race_test_ddf16e6e5ef2fb96\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_password_race_test_ddf16e6e5ef2fb96\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_account_role_test_2c72d85300a7ddc1\"}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"account\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"role\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"proposed-role-upgrade\",\"freshDecision\":403,\"pendingDecision\":409,\"versionBeforeAssignment\":0,\"versionAfterAssignment\":0,\"administrativePermissionGranted\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_account_role_test_2c72d85300a7ddc1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_account_role_test_2c72d85300a7ddc1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_version_writers_test_23b35f7f9485f28a\"}\n",
    "REVIEW_MEASURE {\"case\":\"version-overwritten-role\",\"initialVersion\":0,\"promotedVersion\":1,\"afterOrdinaryEdit\":1,\"currentReset\":403,\"racingReset\":409,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"version-overwritten-override\",\"initialVersion\":0,\"promotedVersion\":1,\"afterOrdinaryEdit\":1,\"currentReset\":403,\"racingReset\":409,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"stale-role-rename\",\"rename\":409,\"versionBeforeRestore\":1,\"versionAfterRestore\":1,\"administrativePermissionRestored\":false,\"racingReset\":200,\"enabledAfter\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_version_writers_test_23b35f7f9485f28a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_version_writers_test_23b35f7f9485f28a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_auth_races_test_8966bfce8f4debac\"}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-role\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-override\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-direct\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":1,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":false,\"issuerSawEnabled\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":2,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":true,\"issuerSawEnabled\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_auth_races_test_8966bfce8f4debac\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_auth_races_test_8966bfce8f4debac\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_session_boundary_test_4c366bf8eff5c5bd\"}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"before-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":401,\"fullSession\":null,\"rowRevoked\":true}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"after-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":200,\"fullSession\":200,\"rowRevoked\":false}\n",
    "REVIEW_MEASURE {\"case\":\"password-activation-race\",\"activation\":200,\"login\":401,\"newRowAfterActivation\":true,\"rowRevoked\":true,\"issuerSawEnrolled\":true,\"fullSession\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_session_boundary_test_4c366bf8eff5c5bd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_session_boundary_test_4c366bf8eff5c5bd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_factor_paths_test_26a9ba7ec9a68756\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-activation-and-client-factor-proven\",\"activation\":200,\"login\":401,\"tokenIssued\":false,\"activeSessions\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_factor_paths_test_26a9ba7ec9a68756\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_factor_paths_test_26a9ba7ec9a68756\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_auth_test_9b85157d13d5a4fa\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":403,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":401,\"unrestrictedAccess\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_auth_test_9b85157d13d5a4fa\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_auth_test_9b85157d13d5a4fa\"}\n"
  ]
}
