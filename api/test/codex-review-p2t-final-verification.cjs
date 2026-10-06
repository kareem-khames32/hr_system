module.exports = {
  "target": "2c7b350d97abce534b56f5d25e1cc603230b4c36",
  "trackedFilesUnchanged": 3242,
  "databasesAbsent": 17,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_audience_test_a24a4c752e21ba28",
    "hr_custom_fields_test_7e741a3f56134aed",
    "hr_custom_fields_migration_test_c245fa08ea6f77c2",
    "hr_codex_p2t_independent_test_9308209170f4323a",
    "hr_codex_p2t_concurrency_test_bb4b9cecf11db671",
    "hr_codex_p2t_independent_test_da4eca426f2efc8a",
    "hr_codex_p2t_concurrency_test_34317b1e20d0f4db",
    "hr_codex_p2t_independent_test_f98fb66478eea337",
    "hr_codex_p2t_read_races_test_961466ec1e733e16",
    "hr_codex_p2t_migration_shape_test_8905fd9933662699",
    "hr_codex_p2t_independent_test_dbd8c4113dcaa1b4",
    "hr_codex_p2t_read_races_test_c744d50ce7d66a12",
    "hr_codex_p2t_concurrency_test_8dde5097cfa310ad",
    "hr_payroll_bonuses_test_43a0c1942367d971",
    "hr_payroll_typed_deductions_test_4b0ef670b99ff892",
    "hr_modules_test_433463614a1842e2",
    "hr_policies_test_07b97ac8b1e44099"
  ],
  "results": [
    {
      "file": "codex-review-p2t-results-batch.cjs",
      "counts": {
        "tests": 49,
        "failed": 0,
        "passed": 49,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 49,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2t-results-boundaries.cjs",
      "counts": {
        "tests": 8,
        "failed": 5,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2T A: initial draft submission must recheck current employee attributes",
          "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n"
        },
        {
          "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
          "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n"
        },
        {
          "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n"
        },
        {
          "name": "P2T B: edit-only permission must not commit values then answer forbidden",
          "error": "A forbidden response must not follow a committed write"
        },
        {
          "name": "P2T two value saves serialize on employee and retain both distinct keys",
          "error": "Expected SQL blocker not reached"
        }
      ]
    },
    {
      "file": "codex-review-p2t-results-final-independent.cjs",
      "counts": {
        "tests": 9,
        "failed": 4,
        "passed": 5,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 9,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2T A: initial draft submission must recheck current employee attributes",
          "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n"
        },
        {
          "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
          "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n"
        },
        {
          "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n"
        },
        {
          "name": "P2T B: edit-only permission must not commit values then answer forbidden",
          "error": "A forbidden response must not follow a committed write"
        }
      ]
    },
    {
      "file": "codex-review-p2t-results-independent.cjs",
      "counts": {
        "tests": 8,
        "failed": 8,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2T A: initial draft submission must recheck current employee attributes",
          "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n"
        },
        {
          "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
          "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n"
        },
        {
          "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n"
        },
        {
          "name": "P2T B: edit-only permission must not commit values then answer forbidden",
          "error": "A forbidden response must not follow a committed write"
        },
        {
          "name": "P2T controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save",
          "error": "PATCH /users/4: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب acfee367-7e8e-411c-af0d-b6ffe4fa9faf@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}"
        },
        {
          "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
          "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n"
        },
        {
          "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
          "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n"
        },
        {
          "name": "P2T post-write response must not pick up a foreign value after its scope check",
          "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2t-results-migration.cjs",
      "counts": {
        "tests": 2,
        "failed": 2,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2T migration must reject a preexisting ten-column fields table with a wrong required type",
          "error": "094 must not report success on an incompatible same-name table\n\nfalse !== true\n"
        },
        {
          "name": "P2T migration must reject a same-named unique field index on the wrong column",
          "error": "Index name and is_unique alone do not verify key columns\n\nfalse !== true\n"
        }
      ]
    },
    {
      "file": "codex-review-p2t-results-part-a-commit.cjs",
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
          "name": "P2T A: initial draft submission must recheck current employee attributes",
          "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n"
        },
        {
          "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n"
        },
        {
          "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p2t-results-rcsi.cjs",
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
          "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
          "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n"
        },
        {
          "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
          "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n"
        },
        {
          "name": "P2T post-write response must not pick up a foreign value after its scope check",
          "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2t-results-regressions.cjs",
      "counts": {
        "tests": 52,
        "failed": 0,
        "passed": 52,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 52,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2t-results-shape-ui.cjs",
      "counts": {
        "tests": 2,
        "failed": 2,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n"
        },
        {
          "name": "P2T constructor is a valid field key and must not crash the actual audience-editor JSX",
          "error": "Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\""
        }
      ]
    }
  ]
}
