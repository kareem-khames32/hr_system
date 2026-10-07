module.exports = {
  "selected": [
    "codex-review-p3f-auth-races",
    "codex-review-p3f-report-controls",
    "codex-review-p3f-auth-independent",
    "codex-review-p3f-data-independent",
    "codex-review-p3f-documents"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 18,
      "failed": 0,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 18,
      "suites": 0
    },
    "duration_ms": 23625.1261
  },
  "results": [
    {
      "file": "codex-review-p3f-auth-races.integration.cjs",
      "name": "P3F-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 5094.4448,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-races.integration.cjs",
      "name": "P3F-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 282.1338,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-races.integration.cjs",
      "name": "P3F-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 277.3727,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-races.integration.cjs",
      "name": "P3F-R-mail-1: activation while email verification is at factor check 1",
      "ms": 418.7984,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-races.integration.cjs",
      "name": "P3F-R-mail-2: activation while email verification is at factor check 2",
      "ms": 456.8678,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-races.integration.cjs",
      "name": "P3F-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 309.0251,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-report-controls.integration.cjs",
      "name": "P3F-S-permission: final report identity rejects permission after real rendering",
      "ms": 5136.7418,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-report-controls.integration.cjs",
      "name": "P3F-S-disabled: final report identity rejects disabled after real rendering",
      "ms": 71.8597,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-report-controls.integration.cjs",
      "name": "P3F-S-churn: final report identity rejects churn after real rendering",
      "ms": 139.0198,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-independent.integration.cjs",
      "name": "P3F-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 5022.5065,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-independent.integration.cjs",
      "name": "P3F-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 358.1574,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-auth-independent.integration.cjs",
      "name": "P3F-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 306.3962,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-data-independent.integration.cjs",
      "name": "P3F-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 5020.4828,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-data-independent.integration.cjs",
      "name": "P3F-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 154.5488,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-data-independent.integration.cjs",
      "name": "P3F-D03: announcements disappear from board, notifications and read route after account rebinding",
      "ms": 377.0321,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-documents.integration.cjs",
      "name": "P3F-E01: simultaneous expiry scans create one event and one renewal task",
      "ms": 4587.7651,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-documents.integration.cjs",
      "name": "P3F-E02: queued document email is suppressed after recipient account is rebound",
      "ms": 187.45,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3f-documents.integration.cjs",
      "name": "P3F-E03: a queued alert must be suppressed when a replacement document already supersedes it",
      "ms": 142.6204,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23625.1261"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_auth_races_test_48d464d193117c2b\"}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-role\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-override\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-direct\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":1,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":false,\"issuerSawEnabled\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":2,\"activation\":200,\"verification\":401,\"fullSession\":null,\"newSessionAfterActivation\":true,\"issuerSawEnabled\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_auth_races_test_48d464d193117c2b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_auth_races_test_48d464d193117c2b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_reports_test_e683b89ebeeb1a9e\"}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-permission\",\"builds\":1,\"sent\":0,\"failed\":1}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-disabled\",\"builds\":1,\"sent\":0,\"failed\":1}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-churn\",\"builds\":3,\"sent\":0,\"failed\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_reports_test_e683b89ebeeb1a9e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_reports_test_e683b89ebeeb1a9e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_auth_test_4a0cf90f910ea1f2\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":403,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":401,\"unrestrictedAccess\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_auth_test_4a0cf90f910ea1f2\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_auth_test_4a0cf90f910ea1f2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_data_test_bf2e6af61d082584\"}\n",
    "REVIEW_MEASURE {\"case\":\"scheduled-report-scope-after-render\",\"sent\":1,\"foreignBranchInAttachment\":false}\n",
    "REVIEW_MEASURE {\"case\":\"team-foreign-unit-name\",\"employeeInReaderBranch\":true,\"departmentInOtherBranch\":true,\"shownDepartment\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_data_test_bf2e6af61d082584\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_data_test_bf2e6af61d082584\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3f_docs_test_8de45ba44f37656a\"}\n",
    "REVIEW_MEASURE {\"case\":\"superseded-document-email\",\"reportHidesOldDocument\":true,\"mails\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3f_docs_test_8de45ba44f37656a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3f_docs_test_8de45ba44f37656a\"}\n"
  ]
}
