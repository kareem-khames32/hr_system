module.exports = {
  "target": "523c50d2acf6dd22cc183d5b7a2317caa316482f",
  "trackedFilesUnchanged": 2681,
  "databasesAbsent": 22,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 23,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2c_office_edges_test_bb602766efd6faee",
    "hr_file_upload_test_bea2a35bada6a565",
    "hr_audit_log_test_b7eb8db3c04c4805",
    "hr_codex_p2c_a_closure_test_ef6bfc9cbd9b80b0",
    "hr_codex_p2c_office_edges_test_1ff76c2181fae0a3",
    "hr_codex_p2c_office_test_2a371350c284f417",
    "hr_file_upload_test_ab40c35483cdb213",
    "hr_codex_p2c_live_test_8462897a379610d7",
    "hr_codex_p2c_live_controls_test_f916f4cf92e99113",
    "hr_payroll_live_test_fe98d00fb99590cc",
    "hr_payroll_live_rcsi_test_ba2a8e09a269a37f",
    "hr_payroll_accrual_test_120b07d08c6c090c",
    "hr_one_person_test_ad86779eb95f394b",
    "hr_queue_outbox_test_c948d0ff1d6949c4",
    "hr_codex_p2c_live_locks_test_9825e8548fdc70db",
    "hr_decimal_precision_test_068b35bff4b0d62d",
    "hr_decimal_precision_test_54656bd46516cd9e",
    "hr_codex_p2c_screen_history_test_1c1c3c8eeee20e2c",
    "hr_codex_p2a_money_test_10c2001f3b5e0011",
    "hr_codex_p2c_precision_test_cd6162468d29dce9",
    "hr_codex_p2c_script_test_aa4b70cb09460cbf",
    "hr_codex_p2c_script_test_c450c80fee71e1d1"
  ],
  "results": [
    {
      "file": "codex-review-p2c-results-a-final.cjs",
      "counts": {
        "tests": 30,
        "failed": 3,
        "passed": 27,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 30,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2C A OLE mini-stream must exist, not merely fit declared root size",
          "error": "A directory entry without addressable stream bytes must not upload as Word"
        },
        {
          "name": "P2C A normal OLE stream FAT loop cannot substitute for the declared data chain",
          "error": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n"
        },
        {
          "name": "P2C A XML validator must reject a mismatched closing root and non-XML suffix",
          "error": "Strict package metadata parser should reject malformed XML"
        }
      ]
    },
    {
      "file": "codex-review-p2c-results-a-office.cjs",
      "counts": {
        "tests": 23,
        "failed": 5,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 23,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2C A real relationships: actual macro with commented normal type is rejected, renamed main Word and Excel are accepted",
          "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'e95b5da1e11202c1b63c6d92006998db671bb4f3b15630ced5e17b9dfdabfd9e'\n"
        },
        {
          "name": "P2C A OLE mini-stream must exist, not merely fit declared root size",
          "error": "A directory entry without addressable stream bytes must not upload as Word"
        },
        {
          "name": "P2C A normal OLE stream FAT loop cannot substitute for the declared data chain",
          "error": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n"
        },
        {
          "name": "P2C A XML validator must reject a mismatched closing root and non-XML suffix",
          "error": "Strict package metadata parser should reject malformed XML"
        },
        {
          "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
          "error": "Expected values to be strictly equal:\n\n404 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p2c-results-a-real.cjs",
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
      "file": "codex-review-p2c-results-c-closure.cjs",
      "counts": {
        "tests": 45,
        "failed": 0,
        "passed": 45,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 45,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2c-results-c-locks.cjs",
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
          "name": "P2C C busy refresh must report unresolved work instead of remaining zero",
          "error": "Unresolved busy employee must remain pending in the refresh progress response\n\n0 !== 1\n"
        }
      ]
    },
    {
      "file": "codex-review-p2c-results-d-baseline-employee.cjs",
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
          "name": "DP-03: إنشاء موظف ببدلات فيها كسور — المحفوظ بالقرش (الإنشاء بيحفظ الكائن مرتين)",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    basicSalary: 4500.5,\n+   housingAllowance: 1251,\n+   otherAllowance: 100,\n+   transportAllowance: 300,\n+   workPressureAllowance: 10\n-   housingAllowance: 1250.5,\n-   otherAllowance: 99.99,\n-   transportAllowance: 300.25,\n-   workPressureAllowance: 10.1\n  }\n"
        }
      ]
    },
    {
      "file": "codex-review-p2c-results-d-closure.cjs",
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
      "file": "codex-review-p2c-results-d-independent.cjs",
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
          "name": "P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)",
          "error": "Error: Cannot insert the value NULL into column 'branchId', table 'hr_codex_p2c_script_test_aa4b70cb09460cbf.dbo.employees'; column does not allow nulls. INSERT fails."
        }
      ]
    },
    {
      "file": "codex-review-p2c-results-d-script.cjs",
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
          "name": "P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)",
          "error": "Legacy import factory must load the same output precision correction\n\n1251 !== 1250.5\n"
        }
      ]
    }
  ]
}
