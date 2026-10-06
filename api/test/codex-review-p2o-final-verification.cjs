module.exports = {
  "target": "64f3f55baeb9d1e93426755024dd81495499dda6",
  "trackedFilesUnchanged": 3046,
  "databasesAbsent": 27,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 29,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2o_before_after_test_fae86e9d58fc29a9",
    "hr_codex_p2o_cache_test_edfaccfaf26b1b90",
    "hr_codex_p2o_rc_test_0a0ed4e50a957257",
    "hr_codex_p2o_independent_test_d42872f13dc0ea3c",
    "hr_codex_p2o_cache_test_69080b248aefdf38",
    "hr_codex_p2o_rcsi_test_c14b24a4aaa0369d",
    "hr_codex_p2o_migrate_race_test_3a818c7dd5e665bc",
    "hr_codex_p2o_migrate_race_test_a274b51e0431260b",
    "hr_codex_p2o_migrate_race_test_d040f0d608d05d5c",
    "hr_audit_log_test_3ee1f745d461092e",
    "hr_queue_outbox_test_699f6951a717bc8e",
    "hr_notifications_test_54f93d5424cd5904",
    "hr_tasks_test_8c3fca8ed887e716",
    "hr_reqexec_test_ffc44f8b364b8104",
    "hr_delegation_test_1551b4d104d8a3bb",
    "hr_policies_test_8627ee85f85f5475",
    "hr_docack_test_bbea5c805b08eb79",
    "hr_documents_test_eb3c59abf86ecce6",
    "hr_audit_log_migration_test_2be2467de8b57fc7",
    "hr_file_sha_migration_test_bc766edea6a42a0e",
    "hr_queue_migration_test_cb107e39a8b6a5b6",
    "hr_notify_migration_test_65317db25c895ec6",
    "hr_tasks_migration_test_bd1f1ff4fee6d49f",
    "hr_reqexec_migration_test_a8802fe1994467b9",
    "hr_delegation_migration_test_3ba1f084e41cce0d",
    "hr_policies_migration_test_77ed7dbf9cc99f6a",
    "hr_docack_migration_test_eac87dde14949629"
  ],
  "results": [
    {
      "file": "codex-review-p2o-results-before-after.cjs",
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
      "file": "codex-review-p2o-results-independent-rc.cjs",
      "counts": {
        "tests": 47,
        "failed": 0,
        "passed": 47,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 47,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2o-results-independent-rcsi.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2o-results-migration-races-rc-fixed.cjs",
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
      "file": "codex-review-p2o-results-migration-races-rc.cjs",
      "counts": {
        "tests": 9,
        "failed": 1,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 9,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2O migration during a blocked task mutation: fresh link checks under RC and RCSI",
          "error": "Expected values to be strictly equal:\n\n400 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p2o-results-regression-behavior.cjs",
      "counts": {
        "tests": 95,
        "failed": 0,
        "passed": 95,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 95,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2o-results-regression-migrations.cjs",
      "counts": {
        "tests": 27,
        "failed": 0,
        "passed": 27,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 27,
        "suites": 0
      },
      "failures": []
    }
  ]
}
