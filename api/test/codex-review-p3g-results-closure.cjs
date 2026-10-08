module.exports = {
  "selected": [
    "codex-review-p3g-auth-races",
    "codex-review-p3g-session-boundary",
    "codex-review-p3g-auth-independent",
    "codex-review-p3g-data-independent",
    "codex-review-p3g-documents",
    "codex-review-p3g-report-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 21,
      "failed": 0,
      "passed": 21,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 21,
      "suites": 0
    },
    "duration_ms": 25691.3028
  },
  "results": [
    {
      "file": "codex-review-p3g-auth-races.integration.cjs",
      "name": "P3G-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 5084.3421,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-races.integration.cjs",
      "name": "P3G-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 300.0147,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-races.integration.cjs",
      "name": "P3G-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 322.3653,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-races.integration.cjs",
      "name": "P3G-R-mail-1: activation while email verification is at factor check 1",
      "ms": 422.5096,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-races.integration.cjs",
      "name": "P3G-R-mail-2: activation while email verification is at factor check 2",
      "ms": 454.8366,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-races.integration.cjs",
      "name": "P3G-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 317.3473,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-session-boundary.integration.cjs",
      "name": "P3G-S-before-state: email activation on each side of the post-open factor read",
      "ms": 5132.4335,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-session-boundary.integration.cjs",
      "name": "P3G-S-after-state: email activation on each side of the post-open factor read",
      "ms": 467.7728,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-session-boundary.integration.cjs",
      "name": "P3G-S-password: password-only login cannot open a new full session after TOTP activation committed",
      "ms": 276.9112,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-independent.integration.cjs",
      "name": "P3G-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 5342.5502,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-independent.integration.cjs",
      "name": "P3G-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 382.7365,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-auth-independent.integration.cjs",
      "name": "P3G-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 312.6566,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-data-independent.integration.cjs",
      "name": "P3G-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 5092.5334,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-data-independent.integration.cjs",
      "name": "P3G-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 136.3679,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-data-independent.integration.cjs",
      "name": "P3G-D03: announcements disappear from board, notifications and read route after account rebinding",
      "ms": 329.8672,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-documents.integration.cjs",
      "name": "P3G-E01: simultaneous expiry scans create one event and one renewal task",
      "ms": 4969.2682,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-documents.integration.cjs",
      "name": "P3G-E02: queued document email is suppressed after recipient account is rebound",
      "ms": 199.2291,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-documents.integration.cjs",
      "name": "P3G-E03: a queued alert must be suppressed when a replacement document already supersedes it",
      "ms": 151.3709,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-report-controls.integration.cjs",
      "name": "P3G-S-permission: final report identity rejects permission after real rendering",
      "ms": 5066.9626,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-report-controls.integration.cjs",
      "name": "P3G-S-disabled: final report identity rejects disabled after real rendering",
      "ms": 69.7527,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-report-controls.integration.cjs",
      "name": "P3G-S-churn: final report identity rejects churn after real rendering",
      "ms": 148.8657,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 21",
    "suites 0",
    "pass 21",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 25691.3028"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_auth_races_test_228bc081f42f97fe\"}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-role\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-override\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-direct\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":1,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":false,\"issuerSawEnabled\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":2,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":true,\"issuerSawEnabled\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_auth_races_test_228bc081f42f97fe\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_auth_races_test_228bc081f42f97fe\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_session_boundary_test_05ecaab2ee090ebc\"}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"before-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":401,\"fullSession\":null,\"rowRevoked\":true}\n",
    "REVIEW_MEASURE {\"case\":\"post-open-boundary\",\"stage\":\"after-state\",\"rowExistedBeforeActivation\":true,\"activation\":200,\"verification\":200,\"fullSession\":200,\"rowRevoked\":false}\n",
    "REVIEW_MEASURE {\"case\":\"password-activation-race\",\"activation\":200,\"login\":401,\"newRowAfterActivation\":true,\"rowRevoked\":true,\"issuerSawEnrolled\":true,\"fullSession\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_session_boundary_test_05ecaab2ee090ebc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_session_boundary_test_05ecaab2ee090ebc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_auth_test_b62b40338b044bbf\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":403,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":401,\"unrestrictedAccess\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_auth_test_b62b40338b044bbf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_auth_test_b62b40338b044bbf\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_data_test_d6c780f241e993d4\"}\n",
    "REVIEW_MEASURE {\"case\":\"scheduled-report-scope-after-render\",\"sent\":1,\"foreignBranchInAttachment\":false}\n",
    "REVIEW_MEASURE {\"case\":\"team-foreign-unit-name\",\"employeeInReaderBranch\":true,\"departmentInOtherBranch\":true,\"shownDepartment\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_data_test_d6c780f241e993d4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_data_test_d6c780f241e993d4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_docs_test_c1230cb8bacfc8e0\"}\n",
    "REVIEW_MEASURE {\"case\":\"superseded-document-email\",\"reportHidesOldDocument\":true,\"mails\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_docs_test_c1230cb8bacfc8e0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_docs_test_c1230cb8bacfc8e0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_reports_test_66f975dd7b10e157\"}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-permission\",\"builds\":1,\"sent\":0,\"failed\":1}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-disabled\",\"builds\":1,\"sent\":0,\"failed\":1}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-churn\",\"builds\":3,\"sent\":0,\"failed\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_reports_test_66f975dd7b10e157\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_reports_test_66f975dd7b10e157\"}\n"
  ]
}
