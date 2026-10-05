module.exports = {
  "target": "bdf069551e2ab25f622cb79c3660726f627f109a",
  "trackedFilesUnchanged": 2763,
  "databasesAbsent": 17,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2e_boundaries_test_b54e3fa197a91b67",
    "hr_codex_p2e_boundaries_test_945b470a9b1e7beb",
    "hr_codex_p2e_boundaries_test_4537aa899dfa8786",
    "hr_codex_p2e_boundaries_test_c46a05e2d83fdee9",
    "hr_codex_p2e_boundaries_test_e6e159c473f51347",
    "hr_codex_p2e_boundaries_test_9b2fad784c8d6b95",
    "hr_notifications_test_2bc3092a3b8882fc",
    "hr_notify_migration_test_878654b4bb831842",
    "hr_queue_outbox_test_f55af914d21ff66b",
    "hr_chain_holders_test_650341814e636a88",
    "hr_recovery_test_3e3c25dbf4d57a78",
    "hr_one_person_test_dbb19801765e8d5e",
    "hr_codex_p2e_boundaries_test_83488c2f559372e1",
    "hr_modules_test_1410718ea86299fc",
    "hr_scheduled_jobs_test_ef5b2dc1d2d940af",
    "hr_recovery_test_127e3cc3b21c8567",
    "hr_scheduled_jobs_test_181db05173e565e1"
  ],
  "results": [
    {
      "file": "codex-review-p2e-results-atomicity-final.cjs",
      "counts": {
        "tests": 1,
        "failed": 0,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2e-results-atomicity.cjs",
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
      "failures": [
        {
          "name": "P2E added request events are atomic: outbox failure rolls back submission and return",
          "error": "No metadata for \"RequestAction\" was found."
        }
      ]
    },
    {
      "file": "codex-review-p2e-results-boundaries-final-api.cjs",
      "counts": {
        "tests": 6,
        "failed": 5,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
          "error": "A destination closed to the recipient must not remain accessible by queued mail"
        },
        {
          "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
          "error": "Relinked account may not receive an inaccessible previous employees request"
        },
        {
          "name": "P2E digest observes quiet hours and resumes after they end",
          "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n"
        },
        {
          "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
          "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n"
        },
        {
          "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
          "error": "Confidentiality must not remove stale-return checks"
        }
      ]
    },
    {
      "file": "codex-review-p2e-results-boundaries-final.cjs",
      "counts": {
        "tests": 6,
        "failed": 5,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
          "error": "Error: Cannot insert duplicate key row in object 'dbo.payroll_runs' with unique index 'UX_payroll_run_period_name'. The duplicate key value is (2026-09, مسير مصطنع لفحص الإشعار)."
        },
        {
          "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
          "error": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n"
        },
        {
          "name": "P2E digest observes quiet hours and resumes after they end",
          "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n"
        },
        {
          "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
          "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n"
        },
        {
          "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
          "error": "Confidentiality must not remove stale-return checks"
        }
      ]
    },
    {
      "file": "codex-review-p2e-results-boundaries-verified.cjs",
      "counts": {
        "tests": 6,
        "failed": 5,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
          "error": "A destination closed to the recipient must not remain accessible by queued mail"
        },
        {
          "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
          "error": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n"
        },
        {
          "name": "P2E digest observes quiet hours and resumes after they end",
          "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n"
        },
        {
          "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
          "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n"
        },
        {
          "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
          "error": "Confidentiality must not remove stale-return checks"
        }
      ]
    },
    {
      "file": "codex-review-p2e-results-boundaries.cjs",
      "counts": {
        "tests": 6,
        "failed": 5,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
          "error": "Expected values to be strictly equal:\n\n200 !== 404\n"
        },
        {
          "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
          "error": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n"
        },
        {
          "name": "P2E digest observes quiet hours and resumes after they end",
          "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n"
        },
        {
          "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
          "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n"
        },
        {
          "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
          "error": "POST /requests/7/act: 400 {\"message\":[\"action must be one of the following values: APPROVE, REJECT, RETURN\"],\"error\":\"Bad Request\",\"statusCode\":400}"
        }
      ]
    },
    {
      "file": "codex-review-p2e-results-core.cjs",
      "counts": {
        "tests": 82,
        "failed": 0,
        "passed": 82,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 82,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2e-results-independent-final.cjs",
      "counts": {
        "tests": 7,
        "failed": 5,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
          "error": "A destination closed to the recipient must not remain accessible by queued mail"
        },
        {
          "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
          "error": "Relinked account may not receive an inaccessible previous employees request"
        },
        {
          "name": "P2E digest observes quiet hours and resumes after they end",
          "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n"
        },
        {
          "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
          "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n"
        },
        {
          "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
          "error": "Confidentiality must not remove stale-return checks"
        }
      ]
    },
    {
      "file": "codex-review-p2e-results-regression.cjs",
      "counts": {
        "tests": 56,
        "failed": 1,
        "passed": 55,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 56,
        "suites": 0
      },
      "failures": [
        {
          "name": "SJ-3: شاشة المهام لحساب الشركة بإدارة الإعدادات (الفرع ومن غير الصلاحية 403)، ومسح الأقدم من 30 يوم",
          "error": "The expression evaluated to a falsy value:\n\n  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)\n"
        }
      ]
    },
    {
      "file": "codex-review-p2e-results-schedules-final.cjs",
      "counts": {
        "tests": 4,
        "failed": 0,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": []
    }
  ]
}
