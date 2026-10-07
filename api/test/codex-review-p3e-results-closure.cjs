module.exports = {
  "selected": [
    "codex-review-p3e-auth-independent",
    "codex-review-p3e-data-independent",
    "codex-review-p3e-documents"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 9,
      "failed": 0,
      "passed": 9,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 49465.376
  },
  "results": [
    {
      "file": "codex-review-p3e-auth-independent.integration.cjs",
      "name": "P3E-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 19211.8956,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-auth-independent.integration.cjs",
      "name": "P3E-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 1540.2072,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-auth-independent.integration.cjs",
      "name": "P3E-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 1094.7808,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-data-independent.integration.cjs",
      "name": "P3E-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 20897.7899,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-data-independent.integration.cjs",
      "name": "P3E-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 673.4099,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-data-independent.integration.cjs",
      "name": "P3E-D03: announcements disappear from board, notifications and read route after account rebinding",
      "ms": 2559.9653,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-documents.integration.cjs",
      "name": "P3E-E01: simultaneous expiry scans create one event and one renewal task",
      "ms": 11288.0399,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-documents.integration.cjs",
      "name": "P3E-E02: queued document email is suppressed after recipient account is rebound",
      "ms": 302.2454,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-documents.integration.cjs",
      "name": "P3E-E03: a queued alert must be suppressed when a replacement document already supersedes it",
      "ms": 201.2147,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 9",
    "suites 0",
    "pass 9",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 49465.376"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3e_auth_test_d4df56e7bbe3ebd3\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":403,\"enabledAfter\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":401,\"unrestrictedAccess\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3e_auth_test_d4df56e7bbe3ebd3\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3e_auth_test_d4df56e7bbe3ebd3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3e_data_test_1503b158af8a317a\"}\n",
    "REVIEW_MEASURE {\"case\":\"scheduled-report-scope-after-render\",\"sent\":1,\"foreignBranchInAttachment\":false}\n",
    "REVIEW_MEASURE {\"case\":\"team-foreign-unit-name\",\"employeeInReaderBranch\":true,\"departmentInOtherBranch\":true,\"shownDepartment\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3e_data_test_1503b158af8a317a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3e_data_test_1503b158af8a317a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3e_docs_test_fe2217425a409dbc\"}\n",
    "REVIEW_MEASURE {\"case\":\"superseded-document-email\",\"reportHidesOldDocument\":true,\"mails\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3e_docs_test_fe2217425a409dbc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3e_docs_test_fe2217425a409dbc\"}\n"
  ]
}
