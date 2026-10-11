module.exports = {
  "target": "43f7b9ecb154625725ae2e2de47c4d9cdd026538",
  "trackedFilesUnchanged": 5146,
  "databasesAbsent": 39,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_orgaudience_test_c6f3d1f5569b970c",
    "hr_orgaudience_test_686dc83b3af707b9",
    "hr_orgaudience_test_f56eed7a2f0db033",
    "hr_notify_channels_test_ce0a1418d8742550",
    "hr_notify_channels_test_13271f9510b7ce7f",
    "hr_orgaudience_test_01acf93ec5455fd9",
    "hr_otaudience_test_ad994f8d386499e3",
    "hr_dashboard_cards_test_b8a4e4251596851d",
    "hr_notify_channels_test_f23eaa39b43013fa",
    "hr_orgaudience_test_afdf9496f455eb86",
    "hr_otaudience_test_b34e547e482dc0b2",
    "hr_dashboard_cards_test_8ecd0045317d6711",
    "hr_notify_channels_test_545655bf56d83392",
    "hr_orgaudience_test_b8b9571433344d7b",
    "hr_otaudience_test_3d0171f85cf04b45",
    "hr_dashboard_cards_test_21fe0b78ccba6a89",
    "hr_notify_channels_test_31ebb409f3e7ba3a",
    "hr_announcements_test_28576b08ee9ca04c",
    "hr_annhome_test_423e2478878ca0bb",
    "hr_surveys_test_e35adfc585fc9ce0",
    "hr_helpdesk_test_72bed510cff31ee5",
    "hr_policies_test_57488d1fc1dabebb",
    "hr_modules_settings_test_adfa2e2feec27733",
    "hr_modules_test_2abc73285584c7e0",
    "hr_tasks_test_de25ea727460ce5a",
    "hr_task_rules_test_3bf9b797ec4b06b3",
    "hr_ot_auto_approve_test_6311e61825705cb6",
    "hr_audience_test_8ad523ce48078ac7",
    "hr_notifications_test_64c38b1916463ecc",
    "hr_perf_reviews_test_e56ac9d6044b9693",
    "hr_training_test_c4696fb36729ae1d",
    "hr_holiday_work_test_cb30ad468b0ddd29",
    "hr_calendar_history_test_a694271bc696a7db",
    "hr_team_dashboard_test_f830652fa10f1ad7",
    "hr_comments_test_11b78736d9e7dd09",
    "hr_custom_fields_test_2be1eefe2bb415e9",
    "hr_job_share_test_a6d570e1e1910145",
    "hr_candidate_apps_test_cb2a4b2bc6273851",
    "hr_recruitment_jobs_test_3234d42b3b1e7688"
  ],
  "results": [
    {
      "file": "codex-review-p7b-results-audience-extended.cjs",
      "counts": {
        "tests": 2,
        "failed": 1,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "name": "P7B-A06: moved unit or parent and missing team fail closed in live audience reads",
          "error": "Error: The UPDATE statement conflicted with the FOREIGN KEY constraint \"FK_ece1d9122a8f3334815ddba096e\". The conflict occurred in database \"hr_orgaudience_test_c6f3d1f5569b970c\", table \"dbo.departments\", column 'id'."
        }
      ]
    },
    {
      "file": "codex-review-p7b-results-audience-final.cjs",
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
    },
    {
      "file": "codex-review-p7b-results-before-lock.cjs",
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
      "file": "codex-review-p7b-results-channels-final.cjs",
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
    },
    {
      "file": "codex-review-p7b-results-independent-final.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p7b-results-independent.cjs",
      "counts": {
        "tests": 14,
        "failed": 1,
        "passed": 13,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 14,
        "suites": 0
      },
      "failures": [
        {
          "name": "P7B-A04 defect: cached module subject retains a moved team until invalidation",
          "error": "{\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p7b-results-regression.cjs",
      "counts": {
        "tests": 226,
        "failed": 0,
        "passed": 226,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 226,
        "suites": 0
      },
      "failures": []
    }
  ]
}
