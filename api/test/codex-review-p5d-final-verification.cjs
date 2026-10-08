module.exports = {
  "target": "6113feeddd57dc71d20f8de8d3b0de4a36e4aaf7",
  "trackedFilesUnchanged": 4755,
  "databasesAbsent": 35,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_fulltest_payroll_test_73a2ea64c4c867b6",
    "hr_expense_reports_test_f3e02fcce57f2f14",
    "hr_expense_reports_test_74423105add5a386",
    "hr_expense_reports_test_049e568cb4970494",
    "hr_expense_reports_test_f6f70827ba865064",
    "hr_expense_reports_test_6023d6271bbf52e3",
    "hr_expense_reports_test_d67bbc2981f1d378",
    "hr_expense_reports_test_7c88e5b3d1f02253",
    "hr_expense_reports_test_b34ae884dcf648a5",
    "hr_expense_reports_test_0fe7063029ed75e2",
    "hr_expense_reports_test_aea0d3e11eb754bc",
    "hr_expense_reports_test_475d70084952f45f",
    "hr_expense_reports_test_d32086a129e36063",
    "hr_expense_reports_test_665690a905ee4a20",
    "hr_expense_reports_test_b9e0b2abe4f7c394",
    "hr_expense_reports_test_3a69fe5d47c38001",
    "hr_expense_reports_test_d7b78730709bd915",
    "hr_expense_reports_test_0772d0215030150e",
    "hr_expense_reports_test_35004d189861fa35",
    "hr_expense_reports_test_391d4b553cd214dd",
    "hr_fulltest_payroll_test_37e678b6f28884fe",
    "hr_expense_reports_test_ce0ae338fe557b31",
    "hr_fulltest_payroll_test_83ca8fb873b5d34c",
    "hr_holiday_work_test_61cb018b56f94a04",
    "hr_leave_attach_test_73c8bd75e77ef802",
    "hr_recovery_test_d7e5589b999d218f",
    "hr_leave_tiers_test_5e695c7870732057",
    "hr_leave_sick_pay_test_94f669526d5abc8f",
    "hr_leave_year_end_test_b436b48b300eb21f",
    "hr_decision_race_test_df9b394e897220e0",
    "hr_recovery_test_0ee179da0db82964",
    "hr_swap_consents_test_d10bf8a8c6894538",
    "hr_expense_reports_test_dd408575e4950b2b",
    "hr_expense_reports_test_c51b36a32a123c2a",
    "hr_expense_reports_test_3eb6f97da693160b"
  ],
  "results": [
    {
      "file": "codex-review-p5d-results-baseline-verified.cjs",
      "counts": {
        "tests": 32,
        "failed": 1,
        "passed": 31,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 32,
        "suites": 0
      },
      "failures": [
        {
          "name": "ZZ — ملخص الملاحظات",
          "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-calendar-closure.cjs",
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
      "file": "codex-review-p5d-results-calendar-corrected.cjs",
      "counts": {
        "tests": 5,
        "failed": 4,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
          "error": "Error: Cannot insert duplicate key row in object 'dbo.leave_types' with unique index 'IDX_600530eb1d9f853dd746e5819c'. The duplicate key value is (CASUAL)."
        },
        {
          "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
          "error": "calendar barrier\n\n0 !== 1\n"
        },
        {
          "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
          "error": "barrier maxBackdateDays\n\n0 !== 1\n"
        },
        {
          "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
          "error": "barrier assertSufficient\n\n0 !== 1\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-calendar-detail.cjs",
      "counts": {
        "tests": 5,
        "failed": 3,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
          "error": "calendar barrier\n\n0 !== 1\n"
        },
        {
          "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
          "error": "barrier maxBackdateDays\n\n0 !== 1\n"
        },
        {
          "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
          "error": "barrier assertSufficient\n\n0 !== 1\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-calendar-final.cjs",
      "counts": {
        "tests": 5,
        "failed": 5,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
          "error": "failed running before hook"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-calendar-verified.cjs",
      "counts": {
        "tests": 5,
        "failed": 5,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
          "error": "failed running before hook"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-calendar.cjs",
      "counts": {
        "tests": 5,
        "failed": 5,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
          "error": "failed running before hook"
        },
        {
          "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
          "error": "failed running before hook"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-closing-checks.cjs",
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
          "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
          "error": "calendar barrier\n\n0 !== 1\n"
        },
        {
          "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
          "error": "barrier maxBackdateDays\n\n0 !== 1\n"
        },
        {
          "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
          "error": "barrier assertSufficient\n\n0 !== 1\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-execution-detail.cjs",
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
          "name": "P5D-T02: final approvals and expense/travel destinations share the held transaction connection",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n    201,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-final.cjs",
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
      "file": "codex-review-p5d-results-independent.cjs",
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
      "file": "codex-review-p5d-results-regression-baseline.cjs",
      "counts": {
        "tests": 32,
        "failed": 1,
        "passed": 31,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 32,
        "suites": 0
      },
      "failures": [
        {
          "name": "ZZ — ملخص الملاحظات",
          "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-regression.cjs",
      "counts": {
        "tests": 141,
        "failed": 1,
        "passed": 140,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 141,
        "suites": 0
      },
      "failures": [
        {
          "name": "ZZ — ملخص الملاحظات",
          "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-transitive-diagnostic.cjs",
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
          "name": "P5D-T02: final approvals and expense/travel destinations share the held transaction connection",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-transitive-verified.cjs",
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
          "name": "P5D-T02: independent final approvals can deadlock in human approval lookup, roll back and retry safely",
          "error": "The expression evaluated to a falsy value:\n\n  assert.ok(result.errors.every(e=>e.number===1205&&e.query.includes('request_approvals')))\n"
        }
      ]
    },
    {
      "file": "codex-review-p5d-results-transitive.cjs",
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
          "name": "P5D-T02: final approvals and expense/travel destinations share the held transaction connection",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n"
        }
      ]
    }
  ]
}
