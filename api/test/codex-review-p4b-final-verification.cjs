module.exports = {
  "target": "aaa2bad1081eefada4cb0510efed41020346daf1",
  "trackedFilesUnchanged": 4350,
  "databasesAbsent": 29,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_payroll_statutory_test_bfa6b183bf968759",
    "hr_statutory_pack_test_f9cda1959a99cab0",
    "hr_overtime_legal_test_fdb021cc7eeda9e8",
    "hr_penalty_fine_cap_test_2a2c230c3d15cc57",
    "hr_resignation_terms_test_d9f33ac5b66da56f",
    "hr_leave_tiers_test_6e01d2efea9bdc29",
    "hr_employee_privacy_test_dff4e5d3e3b1e769",
    "hr_employee_export_test_a235292662437a35",
    "hr_payroll_corrections_test_12e743c70e9bb6e4",
    "hr_chain_disburse_test_57f7a5ace24a45e1",
    "hr_payroll_reports_test_991c70d5ab4363e2",
    "hr_leave_year_end_test_00ca93323fe125cf",
    "hr_recovery_test_d24d6e04479fd240",
    "hr_employment_periods_test_db73c0e579a81a67",
    "hr_payroll_statutory_test_ee75f42dced9b8fb",
    "hr_leave_tiers_test_753b837184bba613",
    "hr_employee_privacy_test_43af73d565b45b4a",
    "hr_employee_privacy_test_a85a25bd02e0615c",
    "hr_employee_privacy_test_a9129aba55eb8f32",
    "hr_employee_privacy_test_203ddb756df6f15d",
    "hr_payroll_statutory_test_bddc2a6712e3344f",
    "hr_leave_tiers_test_fa5cee571c6b575f",
    "hr_employee_privacy_test_131fd8ae1fca86a2",
    "hr_employee_privacy_test_28cd3eb17abcb04b",
    "hr_payroll_statutory_test_d046697bc57d9008",
    "hr_payroll_statutory_test_68abebc25974c94d",
    "hr_overtime_legal_test_cb5dfb57daf974be",
    "hr_payroll_statutory_test_6fa009ce2993dbc1",
    "hr_leave_tiers_test_c6b5986aca37f867"
  ],
  "results": [
    {
      "file": "codex-review-p4b-results-affected.cjs",
      "counts": {
        "tests": 100,
        "failed": 0,
        "passed": 100,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 100,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p4b-results-closure.cjs",
      "counts": {
        "tests": 8,
        "failed": 0,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p4b-results-derived.cjs",
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
      "file": "codex-review-p4b-results-independent.cjs",
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
          "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
          "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'CALCULATOR_UNVERIFIED'\n"
        },
        {
          "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
          "error": "Cannot read properties of undefined (reading 'egTax')"
        },
        {
          "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
          "error": "Cannot read properties of undefined (reading 'egTax')"
        }
      ]
    },
    {
      "file": "codex-review-p4b-results-locks.cjs",
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
      "file": "codex-review-p4b-results-tax-expanded.cjs",
      "counts": {
        "tests": 5,
        "failed": 0,
        "passed": 5,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p4b-results-tax-overtime-final.cjs",
      "counts": {
        "tests": 7,
        "failed": 0,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p4b-results-tax.cjs",
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
          "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
          "error": "{\"message\":\"مفيش تغيير\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p4b-results-tier-writers.cjs",
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
    }
  ]
}
