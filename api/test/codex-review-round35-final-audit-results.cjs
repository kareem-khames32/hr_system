module.exports = {
  "checkedAt": "2026-10-03T04:52:42.749Z",
  "target": "21c07f3b6854d0ebd18ef451d76bdd6a10661397",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 2036,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 12,
  "databases": [
    {
      "name": "hr_codex_r34_boundaries_test_5f50ba78cc5f37ac",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r34_exemption_events_test_2bcfa93137dddd98",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r34_independent_test_269b105ef134da04",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r35_downstream_test_3b1f6648e748d6cc",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r35_downstream_test_8c162577f443a4be",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r35_downstream_test_e67f248c44df758f",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r35_independent_test_417e6f4d520cb9ca",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_loan_completion_test_5e78eac706707505",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_allowances_test_7b4c05fb8c106a9b",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_bonuses_test_cdb3e5fde1339195",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_8b61b9b838040ecc",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_typed_deductions_test_cab7efd02a59ecf3",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "secretScan": {
    "files": 22,
    "filesWithMatches": []
  },
  "privateTemporaryDirectoryRemoved": true,
  "preservedSuppliedWorktreesAndDependencies": [
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\api\\node_modules"
  ],
  "evidence": {
    "target": "21c07f3b6854d0ebd18ef451d76bdd6a10661397",
    "comparedProductRange": "622b637..21c07f3",
    "relatedCodeLimit": "162d50e..21c07f3",
    "counts": {
      "tests": 61,
      "passed": 57,
      "failed": 4,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round35-results-previous.cjs",
        "selected": [
          "codex-review-round34-independent",
          "codex-review-round34-boundaries",
          "codex-review-round34-exemption-events"
        ],
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
        "file": "codex-review-round35-results-affected.cjs",
        "selected": [
          "payroll-bonuses",
          "payroll-typed-deductions",
          "loan-completion",
          "payroll-financial-exemptions",
          "payroll-allowances"
        ],
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
        "file": "codex-review-round35-results-independent.cjs",
        "selected": [
          "codex-review-round35-independent"
        ],
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
            "file": "codex-review-round35-independent.integration.cjs",
            "name": "CR35 real bonus deduction and loan reversal: in-scope references preserved",
            "error": "bonuses\n+ actual - expected\n\n  [\n    3,\n+   null\n-   4\n  ]\n"
          }
        ]
      },
      {
        "file": "codex-review-round35-results-downstream-expanded.cjs",
        "selected": [
          "codex-review-round35-downstream"
        ],
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
            "file": "codex-review-round35-downstream.integration.cjs",
            "name": "CR35 preview-create: reversal blocker must not expose a foreign payroll holding the carried loan installment",
            "error": "Preview must not include the foreign downstream payroll identifier"
          },
          {
            "file": "codex-review-round35-downstream.integration.cjs",
            "name": "CR35 approve: reversal blocker must not expose a foreign payroll holding the carried loan installment",
            "error": "Preview must not include the foreign downstream payroll identifier"
          },
          {
            "file": "codex-review-round35-downstream.integration.cjs",
            "name": "CR35 pay: reversal blocker must not expose a foreign payroll holding the carried loan installment",
            "error": "Preview must not include the foreign downstream payroll identifier"
          }
        ]
      },
      {
        "file": "codex-review-round35-results-payload.cjs",
        "selected": [
          "codex-review-round35-payload"
        ],
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
      }
    ],
    "diagnostics": [
      {
        "case": "request-payroll-reference-lifecycle",
        "kind": "bonus",
        "foreignHidden": true,
        "companyVisible": true,
        "selfVisible": true,
        "reservedRefusal": 409,
        "closedPeriod": 400,
        "deferredEventRedacted": true,
        "storedEventsUnchanged": true,
        "amount": 123.45,
        "net": 9123.45,
        "reconciliation": null
      },
      {
        "case": "request-payroll-reference-lifecycle",
        "kind": "deduction",
        "foreignHidden": true,
        "companyVisible": true,
        "selfVisible": true,
        "reservedRefusal": 409,
        "closedPeriod": 400,
        "deferredEventRedacted": true,
        "storedEventsUnchanged": true,
        "amount": 67.89,
        "net": 8932.11,
        "reconciliation": "snapshot branch B only; difference 0"
      },
      {
        "case": "carry-event-run-reference",
        "directRunStatus": 403,
        "requestDetailStatus": 200,
        "branchEvents": [
          {
            "type": "CARRY_FORWARD",
            "runId": null
          },
          {
            "type": "CARRY_SUSPENDED",
            "runId": null
          }
        ],
        "companyEvents": [
          {
            "type": "CARRY_FORWARD",
            "runId": 1
          },
          {
            "type": "CARRY_SUSPENDED",
            "runId": 2
          }
        ],
        "actionResponseEvents": [
          {
            "type": "CARRY_FORWARD",
            "runId": null
          },
          {
            "type": "CARRY_SUSPENDED",
            "runId": null
          }
        ],
        "ledgerReferencesHidden": true,
        "pastPeriodRejectedWithoutWrite": true,
        "paid": 2000,
        "remaining": 500,
        "storedEvidenceUnchangedByReads": true
      },
      {
        "case": "reservation-guards",
        "guardCount": 2,
        "status": 409,
        "code": "PAYRUN-OBLIGATION-RESERVED",
        "foreignRunReferenceAbsent": true,
        "ledgerUnchanged": true
      },
      {
        "case": "exemption-event-run-reference",
        "disposition": "DROP",
        "directRunStatus": 403,
        "detailStatus": 200,
        "branchEvents": [
          {
            "type": "EXEMPTION_GRANTED",
            "runId": null
          },
          {
            "type": "EXEMPTED",
            "runId": null
          }
        ],
        "companyEvents": [
          {
            "type": "EXEMPTION_GRANTED",
            "runId": 1
          },
          {
            "type": "EXEMPTED",
            "runId": 1
          }
        ],
        "exemptionAmount": 123.45,
        "beforeNet": 8876.55,
        "afterNet": 9000,
        "storedEvidenceUnchangedByRead": true
      },
      {
        "case": "exemption-event-run-reference",
        "disposition": "DEFER_ONE_PERIOD",
        "directRunStatus": 403,
        "detailStatus": 200,
        "branchEvents": [
          {
            "type": "EXEMPTION_GRANTED",
            "runId": null
          },
          {
            "type": "DEFERRED_BY_EXEMPTION",
            "runId": null
          }
        ],
        "companyEvents": [
          {
            "type": "EXEMPTION_GRANTED",
            "runId": 2
          },
          {
            "type": "DEFERRED_BY_EXEMPTION",
            "runId": 2
          }
        ],
        "exemptionAmount": 123.45,
        "beforeNet": 8876.55,
        "afterNet": 9000,
        "storedEvidenceUnchangedByRead": true
      },
      {
        "case": "real-reversal-visibility",
        "foreign": true,
        "direct": [
          403,
          403
        ],
        "net": 8755.44,
        "loanCollected": 300.12,
        "loanRestored": 600.24,
        "storedEvidenceUnchanged": true,
        "checks": [
          {
            "route": "bonuses",
            "actual": [
              null,
              null
            ],
            "expected": [
              null,
              null
            ],
            "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي",
            "companyReason": "عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 123.45 قيدًا مستحقًا (#3) للمسير التكميلي أو التالي"
          },
          {
            "route": "deductions",
            "actual": [
              null,
              null
            ],
            "expected": [
              null,
              null
            ],
            "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي",
            "companyReason": "عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 67.89 قيدًا مستحقًا (#4) للمسير التكميلي أو التالي"
          },
          {
            "route": "loan-RESERVED",
            "actual": [
              null
            ],
            "expected": [
              null
            ],
            "reason": null,
            "companyReason": null
          },
          {
            "route": "loan-PAYROLL_POSTED",
            "actual": [
              null
            ],
            "expected": [
              null
            ],
            "reason": null,
            "companyReason": null
          },
          {
            "route": "loan-REVERSAL",
            "actual": [
              null
            ],
            "expected": [
              null
            ],
            "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)",
            "companyReason": "عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)"
          }
        ]
      },
      {
        "case": "real-reversal-visibility",
        "foreign": false,
        "direct": [
          200,
          200
        ],
        "net": 8755.44,
        "loanCollected": 300.12,
        "loanRestored": 600.24,
        "storedEvidenceUnchanged": true,
        "checks": [
          {
            "route": "bonuses",
            "actual": [
              3,
              null
            ],
            "expected": [
              3,
              4
            ],
            "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي",
            "companyReason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي"
          },
          {
            "route": "deductions",
            "actual": [
              3,
              null
            ],
            "expected": [
              3,
              4
            ],
            "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي",
            "companyReason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي"
          },
          {
            "route": "loan-RESERVED",
            "actual": [
              3
            ],
            "expected": [
              3
            ],
            "reason": null,
            "companyReason": null
          },
          {
            "route": "loan-PAYROLL_POSTED",
            "actual": [
              3
            ],
            "expected": [
              3
            ],
            "reason": null,
            "companyReason": null
          },
          {
            "route": "loan-REVERSAL",
            "actual": [
              null
            ],
            "expected": [
              4
            ],
            "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)",
            "companyReason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)"
          }
        ]
      },
      {
        "case": "foreign-downstream-run-reference",
        "stage": "preview-create",
        "ownRun": 1,
        "foreignRun": 2,
        "ownRead": 200,
        "foreignRead": 403,
        "previewBlocked": true,
        "branchBlockers": [
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
            "employeeId": 1,
            "details": {
              "installmentId": 2,
              "runId": 2
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "لقسط الترحيل #2 حركة لاحقة (RESERVED)",
            "employeeId": 1,
            "details": {
              "installmentId": 2
            }
          }
        ],
        "companyBlockers": [
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
            "employeeId": 1,
            "details": {
              "installmentId": 2,
              "runId": 2
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "لقسط الترحيل #2 حركة لاحقة (RESERVED)",
            "employeeId": 1,
            "details": {
              "installmentId": 2
            }
          }
        ],
        "refusal": {
          "code": "PAYRUN-REVERSAL-BLOCKED",
          "message": "تعذر عكس الصرف: قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا (و1 مانعًا آخر)",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
              "employeeId": 1,
              "details": {
                "installmentId": 2,
                "runId": 2
              }
            },
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "لقسط الترحيل #2 حركة لاحقة (RESERVED)",
              "employeeId": 1,
              "details": {
                "installmentId": 2
              }
            }
          ]
        },
        "sourceNet": 0,
        "sourcePaid": 1000,
        "heldInstallment": 500,
        "heldNet": 500,
        "ledgerAndRunsUnchanged": true
      },
      {
        "case": "foreign-downstream-run-reference",
        "stage": "approve",
        "ownRun": 3,
        "foreignRun": 5,
        "ownRead": 200,
        "foreignRead": 403,
        "previewBlocked": true,
        "branchBlockers": [
          {
            "code": "PAYRUN-REVERSAL-EXISTS",
            "message": "بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)",
            "employeeId": 2,
            "details": {
              "reversalRunId": 4
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
            "employeeId": 2,
            "details": {
              "installmentId": 4,
              "runId": 5
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "لقسط الترحيل #4 حركة لاحقة (RESERVED)",
            "employeeId": 2,
            "details": {
              "installmentId": 4
            }
          }
        ],
        "companyBlockers": [
          {
            "code": "PAYRUN-REVERSAL-EXISTS",
            "message": "بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)",
            "employeeId": 2,
            "details": {
              "reversalRunId": 4
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
            "employeeId": 2,
            "details": {
              "installmentId": 4,
              "runId": 5
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "لقسط الترحيل #4 حركة لاحقة (RESERVED)",
            "employeeId": 2,
            "details": {
              "installmentId": 4
            }
          }
        ],
        "refusal": {
          "code": "PAYRUN-REVERSAL-BLOCKED",
          "message": "تعذر المتابعة في مسير العكس: قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
              "employeeId": 2,
              "details": {
                "installmentId": 4,
                "runId": 5
              }
            },
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "لقسط الترحيل #4 حركة لاحقة (RESERVED)",
              "employeeId": 2,
              "details": {
                "installmentId": 4
              }
            }
          ]
        },
        "sourceNet": 0,
        "sourcePaid": 1000,
        "heldInstallment": 500,
        "heldNet": 500,
        "ledgerAndRunsUnchanged": true
      },
      {
        "case": "foreign-downstream-run-reference",
        "stage": "pay",
        "ownRun": 6,
        "foreignRun": 8,
        "ownRead": 200,
        "foreignRead": 403,
        "previewBlocked": true,
        "branchBlockers": [
          {
            "code": "PAYRUN-REVERSAL-EXISTS",
            "message": "بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)",
            "employeeId": 3,
            "details": {
              "reversalRunId": 7
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
            "employeeId": 3,
            "details": {
              "installmentId": 6,
              "runId": 8
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "لقسط الترحيل #6 حركة لاحقة (RESERVED)",
            "employeeId": 3,
            "details": {
              "installmentId": 6
            }
          }
        ],
        "companyBlockers": [
          {
            "code": "PAYRUN-REVERSAL-EXISTS",
            "message": "بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)",
            "employeeId": 3,
            "details": {
              "reversalRunId": 7
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
            "employeeId": 3,
            "details": {
              "installmentId": 6,
              "runId": 8
            }
          },
          {
            "code": "PAYRUN-REVERSAL-DOWNSTREAM",
            "message": "لقسط الترحيل #6 حركة لاحقة (RESERVED)",
            "employeeId": 3,
            "details": {
              "installmentId": 6
            }
          }
        ],
        "refusal": {
          "code": "PAYRUN-REVERSAL-BLOCKED",
          "message": "تعذر المتابعة في مسير العكس: قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا",
              "employeeId": 3,
              "details": {
                "installmentId": 6,
                "runId": 8
              }
            },
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "لقسط الترحيل #6 حركة لاحقة (RESERVED)",
              "employeeId": 3,
              "details": {
                "installmentId": 6
              }
            }
          ]
        },
        "sourceNet": 0,
        "sourcePaid": 1000,
        "heldInstallment": 500,
        "heldNet": 500,
        "ledgerAndRunsUnchanged": true
      },
      {
        "case": "nested-payload-redaction",
        "allowedRetained": true,
        "hiddenAtMultipleDepths": true,
        "amountsAndOriginalPreserved": true,
        "companyDeepEqual": true
      }
    ],
    "sourceComparisons": [
      {
        "revision": "162d50e",
        "file": "api/src/payroll/payroll-reversal-ledger.ts",
        "method": "planPayrollItemReversal",
        "bodyUnchangedIgnoringComments": true
      },
      {
        "revision": "622b637",
        "file": "api/src/payroll/payroll-reversal-ledger.ts",
        "method": "planPayrollItemReversal",
        "bodyUnchangedIgnoringComments": true
      },
      {
        "revision": "622b637",
        "file": "api/src/payroll/payroll.service.ts",
        "method": "assertRunAccess",
        "bodyUnchangedIgnoringComments": true
      },
      {
        "revision": "622b637",
        "file": "api/src/payroll/payroll-corrections.service.ts",
        "method": "createReversal",
        "bodyUnchangedIgnoringComments": true
      }
    ],
    "closure": {
      "id": "CR34-B01",
      "closed": true,
      "evidence": "All six unchanged Round34 tests pass: carry, suspension, grant/drop/defer exemption events and resumed-installment response redact foreign run IDs. Independent real payroll reversal verifies foreign references and reason-number redaction in bonus/deduction events and loan ledger; company and borrower own ledger retain references. Stored evidence unchanged."
    },
    "findings": [
      {
        "id": "CR35-B01",
        "severity": "blocking branch-isolation disclosure",
        "preExisting": true,
        "source": "payroll-reversal-ledger.ts planPayrollItemReversal",
        "routes": [
          "POST /payroll/runs/:id/reversal-preview",
          "POST /payroll/runs/:id/reversals",
          "POST /payroll/runs/:id/approve (reversal)",
          "POST /payroll/runs/:id/pay (reversal)"
        ],
        "reproduction": "Pay an A-only salary-1000 payroll against a 1500 loan: 1000 collected, 500 carried. Actually transfer employee to B effective the following cycle. Calculate and approve B-only payroll reserving the 500 child installment. Reader A can read source A (200), cannot read holding B (403), but preview and create/approve/pay refusals expose B run ID in text and blockers[].details.runId. Three independent employees cover creation, approval and payment. Ledger, events and runs unchanged by rejected actions.",
        "financialResult": "Source net 0, later installment 500, later net 500; refusal remains 409 PAYRUN-REVERSAL-BLOCKED. Preserve the blocking behavior while masking the unrelated run.",
        "note": "Reversal preview may show amounts for the authorized source payroll; this does not authorize the identifier of an entirely foreign downstream payroll. Not the deferred 403/404 existence distinction."
      },
      {
        "id": "CR35-N01",
        "severity": "nonblocking over-redaction regression",
        "source": "payroll-run-visibility.ts payrollRunRefVisibility",
        "reproduction": "A-only custom payroll and its paid reversal are both directly readable by A (200/200). Bonus and deduction PAYROLL_REVERSED events retain originalRunId but return reversalRunId:null and scrub their reason. Loan ledger REVERSAL returns payrollRunId:null. Company retains all references; money is correct.",
        "cause": "assertRunAccess delegates reversal access to parent payroll. The reference helper only checks own membership or legacy stamped branch, without using parentRunId. A generated CUSTOM reversal lacks its own membership/branch snapshot.",
        "whyNonblocking": "No foreign data disclosed or financial action incorrectly allowed; reference is missing from an otherwise visible audit record. Original/reversal pages and company/employee views remain available."
      }
    ],
    "notes": {
      "runtimeTarget": "21c07f3",
      "oldRuntimeExecuted": false,
      "unitCases": 1,
      "sqlIntegrationCases": 60,
      "finance": "9000 + 123.45 bonus - 67.89 deduction - 300.12 loan = 8755.44. Paid loan balance: paid 300.12, remaining 300.12. Actual reversal total -8755.44 restores loan paid 0, remaining 600.24. Stored loan/events unchanged by all reads.",
      "helperCoverage": "Nested object/array run references, allowed references, amount/date preservation, immutable stored input and company deep equality independently executed.",
      "otherPolicies": "Prior owner exceptions including source-parent heads, own payslips, Q-010 amount visibility and deferred existence distinctions unchanged; no new blocker assigned to those exceptions.",
      "preparationCorrection": "First downstream fixture assertion looked for blocker.runId rather than blocker.details.runId. Corrected only the new test. Initial valid reproduction repeated with the expanded create/approve/pay coverage; duplicates excluded from final count.",
      "performanceMeasured": false,
      "fullIntegrationSuiteExecuted": false,
      "fullUnitSuiteExecuted": false,
      "browserExecuted": false,
      "migrationsExecuted": false,
      "productModified": false,
      "oldTestsModified": false,
      "companyDatabasesWritten": false,
      "servicesStartedOrStopped": false,
      "limitations": "Scoped read and targeted runtime tests, not an exhaustive guarantee over all historical endpoints. SQL engine recorded in final audit; compatibility 150 is not a native SQL Server 2019 execution."
    },
    "staticChecks": {
      "target": "21c07f3b6854d0ebd18ef451d76bdd6a10661397",
      "results": [
        {
          "area": "api",
          "exitCode": 0,
          "diagnostics": ""
        },
        {
          "area": ".",
          "exitCode": 0,
          "diagnostics": ""
        }
      ]
    }
  },
  "performanceMeasured": false
}
