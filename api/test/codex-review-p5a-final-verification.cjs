module.exports = {
  "target": "a10dd97f518a7253eff48aa37553c4b5a1f9e816",
  "trackedFilesUnchanged": 4650,
  "databasesAbsent": 42,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_salary_bands_test_d699fec66879cd1b",
    "hr_comp_cycles_test_f8308193fdc21a27",
    "hr_benefits_test_4cad4b3feaf2dafc",
    "hr_benefit_members_test_63a8315fa2e68c9c",
    "hr_benefit_extras_test_dac89ae318f664ab",
    "hr_expense_reports_test_7312f4f246341b58",
    "hr_skills_test_92f3860829eb11d5",
    "hr_schedule_tools_test_2a66fc0697fd2ec9",
    "hr_swap_consents_test_bfb029f4fcb61c56",
    "hr_mobile_punch_test_b1a6e48f3b929135",
    "hr_safety_test_e4a6a380c4b6f433",
    "hr_timesheets_test_49016fe89107e591",
    "hr_report_builder_test_9191d0c6671ed808",
    "hr_people_feedback_test_45fa75baebea79b5",
    "hr_expense_reports_test_664fdbd4f2ee7496",
    "hr_expense_reports_test_999c708c2c8cb4ef",
    "hr_comp_cycles_test_93daaaade83a3eea",
    "hr_report_builder_test_36cd41b9f73d256b",
    "hr_mobile_punch_test_b7d10ce29a2a0071",
    "hr_comp_cycles_test_61f434e5d346a9f2",
    "hr_people_feedback_test_1ea5e60eda8e209d",
    "hr_expense_reports_test_fea7625d757ec7b2",
    "hr_people_feedback_test_bfd74d2407e3ea03",
    "hr_expense_reports_test_a37e415dc8453abe",
    "hr_report_builder_test_0f1d15f3459d8b3f",
    "hr_mobile_punch_test_440acd19ed5930c5",
    "hr_comp_cycles_test_78c36fa778b6b455",
    "hr_swap_consents_test_ac3b1c446dc8bf5a",
    "hr_report_builder_test_afce1239dcbb2d18",
    "hr_swap_consents_test_fa8f84f0ce4360c6",
    "hr_codex_p5a_schema_test_76f4bc5272a57a03",
    "hr_swap_consents_test_3d605a866b0a8a05",
    "hr_swap_consents_test_ee0020b7639dac4f",
    "hr_swap_consents_test_91da486d2d90c59e",
    "hr_modules_test_fff96a17cc2f64fa",
    "hr_modules_settings_test_bacbe6484ef0b29c",
    "hr_recovery_test_f4b22898709e3d21",
    "hr_dependents_test_f0b5377b47ae7121",
    "hr_notifications_test_0b3a8b17b6ea7f40",
    "hr_tasks_test_592f2e7caf8b5c03",
    "hr_salary_change_test_a6237bbabca4350f",
    "hr_migrate_test_65a59d2370ee81fd"
  ],
  "results": [
    {
      "file": "codex-review-p5a-results-batches.cjs",
      "counts": {
        "tests": 74,
        "failed": 0,
        "passed": 74,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 74,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p5a-results-expense-http-proof.cjs",
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
      "file": "codex-review-p5a-results-financial-proof.cjs",
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
      "file": "codex-review-p5a-results-independent1.cjs",
      "counts": {
        "tests": 7,
        "failed": 3,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": [
        {
          "name": "P5A-F01: close does not serialize with feedback response",
          "error": "{\"message\":\"Cannot POST /api/performance/cycles/1/close\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n"
        },
        {
          "name": "P5A-F02: optional comment below minimum is published",
          "error": "Cannot read properties of undefined (reading 'strengths')"
        },
        {
          "name": "P5A-E01: expense money from an auto-approve chain without a reviewer",
          "error": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_expense_reports_test_fea7625d757ec7b2.dbo.approval_chains'; column does not allow nulls. INSERT fails."
        }
      ]
    },
    {
      "file": "codex-review-p5a-results-independent2.cjs",
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
      "file": "codex-review-p5a-results-independent3.cjs",
      "counts": {
        "tests": 5,
        "failed": 2,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P5A-R01: confidential definition is still included by builder",
          "error": "{\"message\":\"حقول غير معرّفة لنوع «طلب سري للبانِي»: leaveTypeCode، fromDate، toDate، leaveType — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
          "error": "all barriers not reached: 6"
        }
      ]
    },
    {
      "file": "codex-review-p5a-results-independent4.cjs",
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
          "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
          "error": "Expected values to be strictly equal:\n\n6 !== 10\n"
        }
      ]
    },
    {
      "file": "codex-review-p5a-results-migrations.cjs",
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
      "file": "codex-review-p5a-results-schedule-complete.cjs",
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
          "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p5a-results-schedule-final.cjs",
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
          "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
          "error": "submission 6 must reach feature read\n\n6 !== 7\n"
        }
      ]
    },
    {
      "file": "codex-review-p5a-results-schedule-proof.cjs",
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
      "file": "codex-review-p5a-results-shared.cjs",
      "counts": {
        "tests": 116,
        "failed": 0,
        "passed": 116,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 116,
        "suites": 0
      },
      "failures": []
    }
  ]
}
