module.exports = {
  "checkedAt": "2026-10-03T05:21:32.556Z",
  "target": "17086dd36aed10de1492215298d94326101acb1c",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 2058,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 15,
  "databases": [
    {
      "name": "hr_chain_disburse_test_f236d7e8b767b7eb",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r34_boundaries_test_beb4202ee88d8dd8",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r34_exemption_events_test_d8bdb6409a72593d",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r34_independent_test_6da651cc060b9e96",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r35_downstream_test_5bbca6a8ea1d8a36",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r35_independent_test_9d61b2816fc3a35b",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r36_downstream_test_beb43f01f61756bd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r36_ledger_response_test_0d3b1408a0f55587",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r36_ledger_test_af1904fa5852cfa1",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_loan_completion_test_5a80fefa763957b5",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_allowances_test_6527c81e58b7a2c8",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_bonuses_test_5e4a62ede93f1806",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_corrections_test_552c7d41a705f29a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_9177c3ab06101b77",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_typed_deductions_test_07e1828611cddfe2",
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
    "target": "17086dd36aed10de1492215298d94326101acb1c",
    "comparedProductRange": "21c07f3..17086dd",
    "relatedCodeLimit": "162d50e..17086dd",
    "counts": {
      "tests": 86,
      "passed": 82,
      "failed": 4,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round36-results-previous35.cjs",
        "selected": [
          "codex-review-round35-independent",
          "codex-review-round35-downstream",
          "codex-review-round35-payload"
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
        "file": "codex-review-round36-results-previous34.cjs",
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
        "file": "codex-review-round36-results-affected.cjs",
        "selected": [
          "payroll-corrections",
          "payroll-bonuses",
          "payroll-typed-deductions",
          "loan-completion",
          "payroll-financial-exemptions",
          "payroll-allowances",
          "payroll-approval-chain-disbursement"
        ],
        "counts": {
          "tests": 66,
          "failed": 0,
          "passed": 66,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 66,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round36-results-boundaries.cjs",
        "selected": [
          "codex-review-round36-boundaries"
        ],
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
        "file": "codex-review-round36-results-ledger.cjs",
        "selected": [
          "codex-review-round36-ledger"
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
            "file": "codex-review-round36-ledger.integration.cjs",
            "name": "CR36 raw obligations APPROVED: foreign run references must be hidden after employee transfer",
            "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n    applied: null,\n+   reserved: 1,\n-   reserved: null,\n    reversal: null\n  }\n"
          },
          {
            "file": "codex-review-round36-ledger.integration.cjs",
            "name": "CR36 raw obligations PAID: foreign run references must be hidden after employee transfer",
            "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 2,\n+   reserved: 2,\n-   applied: null,\n-   reserved: null,\n    reversal: null\n  }\n"
          },
          {
            "file": "codex-review-round36-ledger.integration.cjs",
            "name": "CR36 raw obligations REVERSED: foreign run references must be hidden after employee transfer",
            "error": "Generic obligation list must not disclose payroll references hidden by payroll access\n+ actual - expected\n\n  {\n+   applied: 3,\n+   reserved: 3,\n+   reversal: 4\n-   applied: null,\n-   reserved: null,\n-   reversal: null\n  }\n"
          }
        ]
      },
      {
        "file": "codex-review-round36-results-ledger-response.cjs",
        "selected": [
          "codex-review-round36-ledger-response"
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
            "file": "codex-review-round36-ledger-response.integration.cjs",
            "name": "CR36 cancellation response: foreign payroll reference is hidden",
            "error": "Cancellation response must use the same run-reference scope as list and payroll access\n\n2 !== null\n"
          }
        ]
      }
    ],
    "diagnostics": [
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
              4
            ],
            "expected": [
              3,
              4
            ],
            "reason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي",
            "companyReason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي"
          },
          {
            "route": "deductions",
            "actual": [
              3,
              4
            ],
            "expected": [
              3,
              4
            ],
            "reason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي",
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
              4
            ],
            "expected": [
              4
            ],
            "reason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)",
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
            "message": "قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
            "employeeId": 1,
            "details": {
              "installmentId": 2,
              "runId": null
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
          "message": "تعذر عكس الصرف: قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده (و1 مانعًا آخر)",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
              "employeeId": 1,
              "details": {
                "installmentId": 2,
                "runId": null
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
            "message": "قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
            "employeeId": 2,
            "details": {
              "installmentId": 4,
              "runId": null
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
          "message": "تعذر المتابعة في مسير العكس: قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
              "employeeId": 2,
              "details": {
                "installmentId": 4,
                "runId": null
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
            "message": "قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
            "employeeId": 3,
            "details": {
              "installmentId": 6,
              "runId": null
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
          "message": "تعذر المتابعة في مسير العكس: قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
              "employeeId": 3,
              "details": {
                "installmentId": 6,
                "runId": null
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
      },
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
        "case": "scoped-reversal-blockers",
        "stage": "preview-create",
        "hashIdentical": true,
        "lineBlockersEqual": true,
        "foreignIdAndStatusHidden": true,
        "ownReversalVisible": false,
        "internalFieldAbsent": true,
        "branchAndCompanyStatus": 409,
        "fullFinancialAndAuditStateUnchanged": true
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
            "message": "قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
            "employeeId": 1,
            "details": {
              "installmentId": 2,
              "runId": null
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
          "message": "تعذر عكس الصرف: قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده (و1 مانعًا آخر)",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
              "employeeId": 1,
              "details": {
                "installmentId": 2,
                "runId": null
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
        "case": "scoped-reversal-blockers",
        "stage": "approve",
        "hashIdentical": true,
        "lineBlockersEqual": true,
        "foreignIdAndStatusHidden": true,
        "ownReversalVisible": true,
        "internalFieldAbsent": true,
        "branchAndCompanyStatus": 409,
        "fullFinancialAndAuditStateUnchanged": true
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
            "message": "قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
            "employeeId": 2,
            "details": {
              "installmentId": 4,
              "runId": null
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
          "message": "تعذر المتابعة في مسير العكس: قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
              "employeeId": 2,
              "details": {
                "installmentId": 4,
                "runId": null
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
        "case": "scoped-reversal-blockers",
        "stage": "pay",
        "hashIdentical": true,
        "lineBlockersEqual": true,
        "foreignIdAndStatusHidden": true,
        "ownReversalVisible": true,
        "internalFieldAbsent": true,
        "branchAndCompanyStatus": 409,
        "fullFinancialAndAuditStateUnchanged": true
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
            "message": "قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
            "employeeId": 3,
            "details": {
              "installmentId": 6,
              "runId": null
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
          "message": "تعذر المتابعة في مسير العكس: قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
          "blockers": [
            {
              "code": "PAYRUN-REVERSAL-DOWNSTREAM",
              "message": "قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده",
              "employeeId": 3,
              "details": {
                "installmentId": 6,
                "runId": null
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
        "case": "raw-obligation-run-reference",
        "stage": "APPROVED",
        "runReadStatus": 403,
        "listStatus": 200,
        "branchRefs": {
          "reserved": 1,
          "applied": null,
          "reversal": null
        },
        "companyRefs": {
          "reserved": 1,
          "applied": null,
          "reversal": null
        },
        "cancelRefs": {
          "reserved": 1,
          "applied": null,
          "reversal": null
        },
        "cancelStatus": "CANCELLED",
        "amount": 123.45,
        "net": 9123.45,
        "readsLeaveLedgerUnchanged": true
      },
      {
        "case": "raw-obligation-run-reference",
        "stage": "PAID",
        "runReadStatus": 403,
        "listStatus": 200,
        "branchRefs": {
          "reserved": 2,
          "applied": 2,
          "reversal": null
        },
        "companyRefs": {
          "reserved": 2,
          "applied": 2,
          "reversal": null
        },
        "cancelRefs": null,
        "cancelStatus": null,
        "amount": 123.45,
        "net": 9123.45,
        "readsLeaveLedgerUnchanged": true
      },
      {
        "case": "raw-obligation-run-reference",
        "stage": "REVERSED",
        "runReadStatus": 403,
        "listStatus": 200,
        "branchRefs": {
          "reserved": 3,
          "applied": 3,
          "reversal": 4
        },
        "companyRefs": {
          "reserved": 3,
          "applied": 3,
          "reversal": 4
        },
        "cancelRefs": null,
        "cancelStatus": null,
        "amount": 123.45,
        "net": 9123.45,
        "readsLeaveLedgerUnchanged": true
      },
      {
        "case": "obligation-cancellation-response",
        "foreign": false,
        "runReadStatus": 200,
        "cancellationStatus": 201,
        "storedStatus": "CANCELLED",
        "responseReservedRunId": 1,
        "companyReservedRunId": 1,
        "amount": 123.45,
        "approvedNet": 9123.45,
        "financialFieldsOtherThanCancellationUnchanged": true
      },
      {
        "case": "obligation-cancellation-response",
        "foreign": true,
        "runReadStatus": 403,
        "cancellationStatus": 201,
        "storedStatus": "CANCELLED",
        "responseReservedRunId": 2,
        "companyReservedRunId": 2,
        "amount": 123.45,
        "approvedNet": 9123.45,
        "financialFieldsOtherThanCancellationUnchanged": true
      }
    ],
    "preexisting": [
      {
        "revision": "21c07f3",
        "file": "api/src/payroll/obligations.service.ts",
        "method": "listByEmployee",
        "bodyUnchangedIgnoringComments": true
      },
      {
        "revision": "21c07f3",
        "file": "api/src/payroll/obligations.service.ts",
        "method": "cancel",
        "bodyUnchangedIgnoringComments": true
      },
      {
        "revision": "162d50e",
        "file": "api/src/payroll/obligations.service.ts",
        "method": "listByEmployee",
        "bodyUnchangedIgnoringComments": true
      },
      {
        "revision": "21c07f3",
        "file": "api/src/payroll/payroll-reversal-ledger.ts",
        "method": "postPayrollReversalLine",
        "bodyUnchangedIgnoringComments": true
      }
    ],
    "closures": [
      {
        "id": "CR35-B01",
        "closed": true,
        "evidence": "Unchanged previous tests and expanded independent real SQL tests pass. Preview line and aggregate blockers hide foreign run ID/status; create, approve and pay return 409 to both branch and company without changing complete loan, payroll, installment, allocation or event state. Company retains references. Preview hashes are identical. Internal redactedMessage is absent from all responses."
      },
      {
        "id": "CR35-N01",
        "closed": true,
        "evidence": "Real paid original/reversal both directly readable by branch A (200/200); bonus and deduction PAYROLL_REVERSED and loan REVERSAL keep both allowed refs, while entirely foreign original/reversal remain hidden. Company and employee retain permitted references."
      }
    ],
    "findings": [
      {
        "id": "CR36-B01",
        "severity": "blocking branch-isolation disclosure",
        "preExisting": true,
        "sources": [
          {
            "file": "api/src/payroll/obligations.service.ts",
            "line": 102,
            "method": "listByEmployee"
          },
          {
            "file": "api/src/payroll/obligations.service.ts",
            "line": 116,
            "method": "cancel"
          }
        ],
        "routes": [
          "GET /obligations/employee/:id",
          "POST /obligations/:id/cancel"
        ],
        "fields": [
          "reservedPayrollRunId",
          "appliedPayrollRunId",
          "payrollReversalRunId"
        ],
        "reproduction": "Create a real manual CREDIT 123.45 for a salary-9000 employee in B. Calculate/approve, or pay, or pay/reverse B-only payroll. Transfer employee to A by the real employee API. A reader with payroll.view/payroll.calculate cannot open original or reversal payroll (403) but generic obligations list (200) exposes foreign reservation/application/reversal IDs. Successful cancel response (201) also exposes the foreign reserved payroll ID. Company preserves all refs; an A-only run reference is correctly visible in the positive cancellation control.",
        "amounts": "123.45 credit, approved net 9123.45. Reads leave ledger unchanged. Cancellation intentionally changes status to CANCELLED; tested financial fields and approved payroll amount stay unchanged. This finding is response disclosure, not a requested change to cancellation policy.",
        "expected": "Keep access, amounts and action semantics while applying payroll reference visibility per employee to every run-reference field in list and cancellation responses. Keep company and otherwise permitted refs unchanged.",
        "boundary": "Entirely foreign B membership snapshots, not a mixed payroll head, employee self-view, or deferred 403/404 existence difference."
      }
    ],
    "notes": {
      "runtimeTarget": "17086dd",
      "oldRuntimeExecuted": false,
      "sqlIntegrationCases": 85,
      "unitCases": 1,
      "finance": "Independent true bonus/deduction/loan payment: 9000 + 123.45 - 67.89 - 300.12 = 8755.44; reversal -8755.44; loan restored to paid 0 / remaining 600.24. Separate blocking examples collect 1000 of 1500, carry 500, and later payroll net 500, without any rejected-action financial change.",
      "otherPolicies": "Prior owner exceptions unchanged; no new blocker assigned to them. Raw generic obligations are an additional unmasked reader path, not a reversal-fix regression.",
      "performanceMeasured": false,
      "fullIntegrationSuiteExecuted": false,
      "fullUnitSuiteExecuted": false,
      "browserExecuted": false,
      "migrationsExecuted": false,
      "productModified": false,
      "oldTestsModified": false,
      "companyDatabasesWritten": false,
      "servicesStartedOrStopped": false,
      "limitations": "Scoped reading and executed targeted tests; not an exhaustive assurance for all historical endpoints. SQL engine/version and cleanup recorded separately. Compatibility 150 does not constitute native SQL Server 2019 testing."
    },
    "staticChecks": {
      "target": "17086dd36aed10de1492215298d94326101acb1c",
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
