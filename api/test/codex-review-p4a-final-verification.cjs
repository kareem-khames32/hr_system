module.exports = {
  "target": "6f5964c6bda1d4947faf9768ff7f0b86c927edb7",
  "trackedFilesUnchanged": 4312,
  "databasesAbsent": 49,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_payroll_statutory_test_e13541c204865ac5",
    "hr_overtime_legal_test_d6ca25e624dc2f97",
    "hr_leave_tiers_test_6a84c876c76b6c10",
    "hr_employee_privacy_test_cb3a7ef908b0f71b",
    "hr_suspension_paid_test_f3f3462c0123767e",
    "hr_leave_tiers_test_b7086971c5888e69",
    "hr_banks_test_69aa8facc1caa4ca",
    "hr_payroll_corrections_test_a5363d6bae95804a",
    "hr_payroll_reports_test_7a8e2a41d683ddda",
    "hr_employee_export_test_7116eabb8277c986",
    "hr_attendance_race_test_b39b9b26cb95af2d",
    "hr_employee_suspension_test_081d9fb84ac0c3b3",
    "hr_payroll_settle_test_730774bdeed40195",
    "hr_fulltest_attendance_test_861d07bde5842461",
    "hr_payroll_bonuses_test_9d43385e5679d21a",
    "hr_payroll_typed_deductions_test_3f0ab21c4a2fd95f",
    "hr_data_protection_test_23055c59134b2472",
    "hr_payroll_statutory_test_840db584e03e4706",
    "hr_employee_privacy_test_6356acc53e4b282a",
    "hr_overtime_legal_test_b04c664947efb136",
    "hr_payroll_statutory_test_745a2dc9fb8dc422",
    "hr_statutory_pack_test_12763f3ffaa2a562",
    "hr_eg_salary_tax_test_42f289d709144162",
    "hr_suspension_paid_test_554dea4de7d7081d",
    "hr_penalty_fine_cap_test_46ea1af9a5dc4ea2",
    "hr_leave_tiers_test_24baeb0352b71e8d",
    "hr_employee_privacy_test_c67cd27f0b4bca89",
    "hr_data_protection_test_f0a5c1aa464d09b9",
    "hr_legal_entities_test_125f6cf7a0d5eee6",
    "hr_legal_entities_migration_test_cf2b5dc45b14e5a5",
    "hr_salary_items_test_bc91d935c0707524",
    "hr_statutory_migration_test_a163b966519f7a0d",
    "hr_eos_country_test_9a4592dc5e1045b8",
    "hr_overtime_legal_test_fc5f37cd0efd12c9",
    "hr_resignation_terms_test_583b9542ab5a1ad7",
    "hr_saudization_test_cdd8f391279bf4d7",
    "hr_banks_test_7f416469776ff819",
    "hr_hijri_display_test_de0b3004452050b3",
    "hr_employee_privacy_test_a832990979215209",
    "hr_financial_report_test_ef0f86b3cf6a0e66",
    "hr_cost_center_test_db832bb34ba26b11",
    "hr_gosi_tracks_test_12d0377f29a49ef0",
    "hr_leave_year_end_test_9e5e4ae1f1986727",
    "hr_recovery_test_1f3007a77abdecde",
    "hr_payroll_accrual_test_8b80810f724a7c95",
    "hr_payroll_statutory_test_7cc9ed57be9311ea",
    "hr_payroll_statutory_test_c56287621df1179a",
    "hr_leave_tiers_test_e9d397a78ce2d62f",
    "hr_leave_tiers_test_38b2ac45a6544ad8"
  ],
  "results": [
    {
      "file": "codex-review-p4a-results-closure.cjs",
      "counts": {
        "tests": 6,
        "failed": 0,
        "passed": 6,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p4a-results-controls.cjs",
      "counts": {
        "tests": 91,
        "failed": 0,
        "passed": 91,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 91,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p4a-results-data-protection.cjs",
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
      "file": "codex-review-p4a-results-independent.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P4A-D01: canonical confidential leave definition leaks through data export",
          "error": "{\"message\":\"نوع الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n"
        },
        {
          "name": "P4A-D02: export reads new branch documents after old branch authorization",
          "error": "{\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n\n400 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p4a-results-overtime.cjs",
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
      "file": "codex-review-p4a-results-phase4.cjs",
      "counts": {
        "tests": 59,
        "failed": 6,
        "passed": 53,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 59,
        "suites": 0
      },
      "failures": [
        {
          "name": "PS-01: قبل ترحيل 137 الإيقاف العادي شغال وبيتخصم، و«بأجر» مش متاح وبيترفض؛ والترحيل بيضيف العمود بشكل الكيان وبيتكرر بأمان",
          "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n"
        },
        {
          "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
          "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n"
        },
        {
          "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    null,\n    {\n+     egMid: 21,\n+     egNew: 21,\n+     egOld: 21,\n+     egSenior: 21,\n+     none: 21,\n-     egMid: 25,\n-     egNew: 25,\n-     egOld: 25,\n-     egSenior: 25,\n-     none: 25,\n      notEntitled: 0,\n+     saMid: 21,\n+     saSenior: 21\n-     saMid: 25,\n-     saSenior: 25\n    }\n  ]\n"
        },
        {
          "name": "DP-01: قبل ترحيل 139 الشاشة بتقول إن السجل ناقص ومدد الاحتفاظ شغالة؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
          "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n"
        },
        {
          "name": "BK-01: قبل ترحيل 138 الشاشة بتقول إن الجدول ناقص وكشف البنك شغال من غير تنبيه؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
          "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n"
        },
        {
          "name": "BK-03: كشف البنك وشاشة الصرف — آيبان سليم كوده مش في الجدول متعلّم (السعودي والمصري)، من غير تغيير مبلغ، والتعطيل بيرجّع الدولة من غير تنبيه",
          "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p4a-results-privacy.cjs",
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
      "file": "codex-review-p4a-results-reports.cjs",
      "counts": {
        "tests": 36,
        "failed": 0,
        "passed": 36,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 36,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p4a-results-tax-complete.cjs",
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
      "file": "codex-review-p4a-results-tax-final.cjs",
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
          "name": "P4A-F03: alternative calculated draft contaminates tax of the run that is ultimately approved",
          "error": "{\"code\":\"PAYRUN-DRAFT-CONFLICT\",\"message\":\"توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب\",\"conflicts\":[{\"employeeId\":4,\"otherRunId\":3,\"name\":\"P4A alternative one\",\"status\":\"CALCULATED\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-09-30\",\"overlapDays\":30,\"blocking\":false,\"kind\":\"EXACT\"}]}\n\n409 !== 201\n"
        }
      ]
    },
    {
      "file": "codex-review-p4a-results-tiers-complete.cjs",
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
      "file": "codex-review-p4a-results-tiers-race.cjs",
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
          "name": "P4A-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
          "error": "{\"message\":\"شرائح الخدمة والسن للإجازة برصيد سنوي بس\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n"
        }
      ]
    }
  ]
}
