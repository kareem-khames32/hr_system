module.exports = {
  "target": "6091bafb8be815150b104355ae492c22ec1bf481",
  "trackedFilesUnchanged": 3655,
  "databasesAbsent": 22,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 4,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_session_cookie_test_2068f3ee4cfa77a0",
    "hr_user_sessions_test_790b3f2c7c96f214",
    "hr_user_sessions_migration_test_c959a84eaed31328",
    "hr_totp_test_96e95cbb4d681c80",
    "hr_totp_migration_test_347785fb3dd81d55",
    "hr_2fa_race_test_1a617d919b39a53a",
    "hr_user_temp_pw_test_4b777ea7b946327a",
    "hr_codex_p3d_auth_test_1149e0334036eaa1",
    "hr_codex_p3d_data_test_0de166ee2fcd6436",
    "hr_codex_p3d_docs_test_f1ae01fbf6caaaee",
    "hr_codex_p3d_auth_test_17c192625c7281bd",
    "hr_codex_p3d_data_test_c6dc52a0f18acf0a",
    "hr_announcements_test_46ddc7558ec20a45",
    "hr_announcements_migration_test_5f7277e4c48e0645",
    "hr_document_expiry_test_60d9a1f44f66858e",
    "hr_docexpiry_migration_test_347ae6c8691b1c8d",
    "hr_team_dashboard_test_0f2f5e2b1ede3f3e",
    "hr_report_metrics_test_30799397ff0816db",
    "hr_saved_reports_test_c3c389f443e0531e",
    "hr_saved_reports_migration_test_ada0750cc97517b5",
    "hr_report_metrics_test_ba030021577d52e4",
    "hr_saved_reports_test_ca476e82977826ff"
  ],
  "results": [
    {
      "file": "codex-review-p3d-results-auth-baseline.cjs",
      "counts": {
        "tests": 33,
        "failed": 0,
        "passed": 33,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 33,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3d-results-auth-independent.cjs",
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
      "failures": [
        {
          "name": "P3D-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
          "error": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n"
        },
        {
          "name": "P3D-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
          "error": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n"
        },
        {
          "name": "P3D-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
          "error": "Expected values to be strictly equal:\n\n404 !== 403\n"
        }
      ]
    },
    {
      "file": "codex-review-p3d-results-data-independent.cjs",
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
      "failures": [
        {
          "name": "P3D-D01: scheduled report must revalidate its owner after rendering and before sending",
          "error": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n"
        },
        {
          "name": "P3D-D02: manager team view cannot reveal a department moved outside the reader branch",
          "error": "GET /manager/team: 404 {\"message\":\"Cannot GET /api/manager/team\",\"error\":\"Not Found\",\"statusCode\":404}"
        },
        {
          "name": "P3D-D03: announcements disappear from board, notifications and read route after account rebinding",
          "error": "POST /announcements: 404 {\"message\":\"Cannot POST /api/announcements\",\"error\":\"Not Found\",\"statusCode\":404}"
        }
      ]
    },
    {
      "file": "codex-review-p3d-results-documents.cjs",
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
      "failures": [
        {
          "name": "P3D-E03: a queued alert must be suppressed when a replacement document already supersedes it",
          "error": "a replaced document must not send its old expiry alert\n\n1 !== 0\n"
        }
      ]
    },
    {
      "file": "codex-review-p3d-results-independent-final.cjs",
      "counts": {
        "tests": 6,
        "failed": 4,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3D-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
          "error": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n"
        },
        {
          "name": "P3D-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
          "error": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n"
        },
        {
          "name": "P3D-D01: scheduled report must revalidate its owner after rendering and before sending",
          "error": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n"
        },
        {
          "name": "P3D-D02: manager team view cannot reveal a department moved outside the reader branch",
          "error": "a current foreign unit name must not be projected through an in-scope employee"
        }
      ]
    },
    {
      "file": "codex-review-p3d-results-other-baseline.cjs",
      "counts": {
        "tests": 71,
        "failed": 3,
        "passed": 68,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 71,
        "suites": 0
      },
      "failures": [
        {
          "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n"
        },
        {
          "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
          "error": "Expected values to be strictly equal:\n\n500 !== 200\n"
        },
        {
          "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
          "error": "Expected values to be strictly equal:\n\n0 !== 1\n"
        }
      ]
    },
    {
      "file": "codex-review-p3d-results-reports-pipe.cjs",
      "counts": {
        "tests": 6,
        "failed": 3,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n"
        },
        {
          "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
          "error": "Expected values to be strictly equal:\n\n500 !== 200\n"
        },
        {
          "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
          "error": "Expected values to be strictly equal:\n\n0 !== 1\n"
        }
      ]
    }
  ]
}
