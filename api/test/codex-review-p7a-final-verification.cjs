module.exports = {
  "target": "d890f674d454eb9871ac67e9307e5aece9bc4c77",
  "trackedFilesUnchanged": 5114,
  "databasesAbsent": 43,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_orgaudience_test_cdf7e949797f1060",
    "hr_otaudience_test_6070302c80918877",
    "hr_notify_channels_test_1ef3b271b0bdaef6",
    "hr_notify_channels_migration_test_5a6de18ef90a3b81",
    "hr_dashboard_cards_test_ec0522d17588e513",
    "hr_job_share_test_c9056517012f8e7e",
    "hr_annhome_test_ddd2e6c2d8ccc4e3",
    "hr_perf_reviews_test_2add63c348bd5fc3",
    "hr_training_test_4fbbc4fa3cb4453e",
    "hr_orgaudience_test_5583d8095eb22a45",
    "hr_otaudience_test_9ff2380f858b3794",
    "hr_orgaudience_test_3a16558dea8dca32",
    "hr_otaudience_test_ead2e29b63473ed9",
    "hr_dashboard_cards_test_bcb15f84fb291f13",
    "hr_notify_channels_test_66fc18456f79b9da",
    "hr_announcements_test_61214a21a9a1dc56",
    "hr_surveys_test_3573681652c0e09c",
    "hr_helpdesk_test_539931d64ed0f363",
    "hr_policies_test_b066185c3a9e9173",
    "hr_modules_settings_test_5e53dcde2ec5d7eb",
    "hr_modules_test_bfdf086e2182dc34",
    "hr_tasks_test_b68fce59caa119e4",
    "hr_ot_auto_approve_test_8bc220dcb117944b",
    "hr_audience_test_9913e11cebee0932",
    "hr_candidate_apps_test_5732b449d9c25a0b",
    "hr_recruitment_jobs_test_174274bedb767f94",
    "hr_notifications_test_27adc53604adbf4a",
    "hr_notify_migration_test_96fdff6ee35e946c",
    "hr_report_metrics_test_f19326081a25e34c",
    "hr_team_dashboard_test_43674ebd9a60a0ab",
    "hr_comments_test_5b8ec57902ed555e",
    "hr_holiday_work_test_abd0237130e9b782",
    "hr_calendar_history_test_d3868a698d308183",
    "hr_custom_fields_test_bb36c58766371894",
    "hr_report_metrics_test_07bd692ec4f81e2e",
    "hr_orgaudience_test_e837e31f2558648c",
    "hr_otaudience_test_2d183059bc0c2793",
    "hr_dashboard_cards_test_f2b4269c9f6eb79a",
    "hr_notify_channels_test_260b2da1f9d4752f",
    "hr_dashboard_cards_test_b932c4ecf5a3e3f3",
    "hr_notify_channels_test_34f6a4fa147730f1",
    "hr_dashboard_cards_test_c3f9168c8870dfcc",
    "hr_otaudience_test_5d7db3c47ed70a1d"
  ],
  "results": [
    {
      "file": "codex-review-p7a-results-affected.cjs",
      "counts": {
        "tests": 48,
        "failed": 0,
        "passed": 48,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 48,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p7a-results-extra.cjs",
      "counts": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p7a-results-final-probes.cjs",
      "counts": {
        "tests": 11,
        "failed": 0,
        "passed": 11,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 11,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p7a-results-neighbors.cjs",
      "counts": {
        "tests": 166,
        "failed": 1,
        "passed": 165,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 166,
        "suites": 0
      },
      "failures": [
        {
          "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p7a-results-pdf-control.cjs",
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
          "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p7a-results-probes1.cjs",
      "counts": {
        "tests": 8,
        "failed": 2,
        "passed": 6,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": [
        {
          "name": "P7A-D02: dashboard cache continues exposing names and phones after a transfer",
          "error": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.phone))\n"
        },
        {
          "name": "P7A-N01: daily digest bypasses an event email channel disabled before sending",
          "error": "notifications.savePreference is not a function"
        }
      ]
    },
    {
      "file": "codex-review-p7a-results-probes2.cjs",
      "counts": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p7a-results-probes3.cjs",
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
          "name": "P7A-D03: a confidential custom definition is counted through a department filter",
          "error": "Expected values to be strictly equal:\n\n4 !== 3\n"
        }
      ]
    }
  ]
}
