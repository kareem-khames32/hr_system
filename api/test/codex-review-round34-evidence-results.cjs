module.exports = {
  "target": "622b6377809d233b74a2dc57a19bdbd646ca86c0",
  "comparedProductRange": "2ba6575..622b637",
  "relatedCodeLimit": "162d50e..622b637",
  "counts": {
    "tests": 65,
    "passed": 62,
    "failed": 3,
    "skipped": 0
  },
  "executions": [
    {
      "file": "codex-review-round34-results-previous.cjs",
      "selected": [
        "codex-review-round33-independent"
      ],
      "counts": {
        "tests": 10,
        "failed": 0,
        "passed": 10,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 10,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round34-results-affected.cjs",
      "selected": [
        "payroll-allowances",
        "payroll-bonuses",
        "payroll-typed-deductions",
        "payroll-financial-exemptions",
        "payroll-approval-chain-disbursement"
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
      "file": "codex-review-round34-results-independent-v2.cjs",
      "selected": [
        "codex-review-round34-independent"
      ],
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
      "file": "codex-review-round34-results-boundaries-confirmed.cjs",
      "selected": [
        "codex-review-round34-boundaries"
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
          "file": "codex-review-round34-boundaries.integration.cjs",
          "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
          "error": "Foreign run IDs must be hidden in events as well as obligation fields\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'CARRY_FORWARD'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'CARRY_SUSPENDED'\n    }\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-round34-results-exemption-events-final.cjs",
      "selected": [
        "codex-review-round34-exemption-events"
      ],
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
          "file": "codex-review-round34-exemption-events.integration.cjs",
          "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
          "error": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 1,\n-     runId: null,\n      type: 'EXEMPTED'\n    }\n  ]\n"
        },
        {
          "file": "codex-review-round34-exemption-events.integration.cjs",
          "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
          "error": "Foreign payroll reference must also be hidden for exemption events\n+ actual - expected\n\n  [\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'EXEMPTION_GRANTED'\n    },\n    {\n+     runId: 2,\n-     runId: null,\n      type: 'DEFERRED_BY_EXEMPTION'\n    }\n  ]\n"
        }
      ]
    }
  ],
  "diagnostics": [
    {
      "case": "allowance-cancellation",
      "foreign": false,
      "action": "line",
      "rows": 1,
      "referenceVisible": true,
      "netBefore": 9150.25,
      "netAfter": 9000,
      "companyReferenceVisible": true
    },
    {
      "case": "allowance-cancellation",
      "foreign": false,
      "action": "grant",
      "rows": 2,
      "referenceVisible": true,
      "netBefore": 9150.25,
      "netAfter": 9000,
      "companyReferenceVisible": true
    },
    {
      "case": "allowance-cancellation",
      "foreign": true,
      "action": "line",
      "rows": 1,
      "referenceVisible": false,
      "netBefore": 9150.25,
      "netAfter": 9000,
      "companyReferenceVisible": true
    },
    {
      "case": "allowance-cancellation",
      "foreign": true,
      "action": "grant",
      "rows": 2,
      "referenceVisible": false,
      "netBefore": 9150.25,
      "netAfter": 9000,
      "companyReferenceVisible": true
    },
    {
      "case": "allowance-mixed-member-scope",
      "members": 2,
      "allowanceEmployeeBranch": 2,
      "otherEmployeeBranch": 1,
      "referenceHidden": true
    },
    {
      "case": "allowance-refusal-reference",
      "paid": false,
      "responseStatus": 409,
      "response": {
        "message": "البدل ده في مسير معتمد برّه نطاق صلاحيتك — محتاج حساب يشوف المسير يفتحه الأول",
        "error": "Conflict",
        "statusCode": 409
      },
      "foreignRunId": 6,
      "listRunId": null,
      "directRead": 403,
      "ledgerUnchanged": true,
      "leaked": false
    },
    {
      "case": "allowance-refusal-reference",
      "paid": true,
      "responseStatus": 409,
      "response": {
        "message": "البدل ده اتصرف في مسير برّه نطاق صلاحيتك — مينفعش يتلغي",
        "error": "Conflict",
        "statusCode": 409
      },
      "foreignRunId": 7,
      "listRunId": null,
      "directRead": 403,
      "ledgerUnchanged": true,
      "leaked": false
    },
    {
      "case": "allowance-locked-response",
      "foreign": false,
      "total": 150.25,
      "lockedRuns": [
        {
          "id": 8,
          "name": "CR33 locked VISIBLE A 8",
          "status": "APPROVED"
        }
      ],
      "companyReferenceVisible": true
    },
    {
      "case": "allowance-locked-response",
      "foreign": true,
      "total": 150.25,
      "lockedRuns": [],
      "companyReferenceVisible": true
    },
    {
      "case": "legacy-payroll-reference",
      "ownVisible": true,
      "foreignHidden": true,
      "companyBothVisible": true,
      "fixture": "explicit pre-membership shape in disposable database only"
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
          "runId": 1
        },
        {
          "type": "CARRY_SUSPENDED",
          "runId": 2
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
          "runId": 1
        },
        {
          "type": "CARRY_SUSPENDED",
          "runId": 2
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
          "runId": 1
        },
        {
          "type": "EXEMPTED",
          "runId": 1
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
          "runId": 2
        },
        {
          "type": "DEFERRED_BY_EXEMPTION",
          "runId": 2
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
    }
  ],
  "sourceComparisons": [
    {
      "revision": "162d50e",
      "file": "api/src/payroll/payroll-obligation-ledger.ts",
      "function": "postPayrollObligations",
      "bodyUnchangedIgnoringComments": true
    },
    {
      "revision": "2ba6575",
      "file": "api/src/payroll/payroll-obligation-ledger.ts",
      "function": "postPayrollObligations",
      "bodyUnchangedIgnoringComments": true
    },
    {
      "revision": "162d50e",
      "file": "api/src/payroll/payroll-financial-exemption-ledger.ts",
      "function": "postExemptedObligations",
      "bodyUnchangedIgnoringComments": true
    },
    {
      "revision": "2ba6575",
      "file": "api/src/payroll/payroll-financial-exemption-ledger.ts",
      "function": "postExemptedObligations",
      "bodyUnchangedIgnoringComments": true
    }
  ],
  "preparationCorrections": [
    {
      "file": "independent",
      "reason": "Employee self-service is /mine; an employee without an administrative basis gets 404 on the administrative detail route. Removed that incorrect positive detail assertion, retained real own /mine verification."
    },
    {
      "file": "boundaries",
      "reason": "Resume of a historical period returns DEDUCTION_PERIOD_PAST before the closed-period guard. The final test records this correctly; the closed-resume message is read in code but not independently forced in this scenario."
    },
    {
      "file": "boundaries-v2",
      "reason": "A transfer effective today cannot overlap a future paid payroll; the API correctly returned 409. Final reproduction uses real past July/August 2026 payrolls and a real current transfer."
    },
    {
      "file": "boundaries-v3",
      "reason": "Direct future transfer correctly returned 400; future transfers require their request workflow. No guard bypassed in the final reproduction."
    },
    {
      "file": "boundaries-v4",
      "reason": "A prior-year payroll was outside the fixture policy effective date. Final reproduction uses fixed past July/August 2026, inside the published policy."
    },
    {
      "file": "exemption-events",
      "reason": "QUALITY was a fixture category typo; valid product category is PERFORMANCE."
    },
    {
      "file": "exemption-events-confirmed",
      "reason": "Fixture called calculate on CALCULATED instead of recalculate; corrected the new test only."
    },
    {
      "file": "exemption-events-v3",
      "reason": "Recalculate requires a reason. Added the fixture reason; final reproduction reaches the disclosure assertions."
    }
  ],
  "findings": [
    {
      "id": "CR34-B01",
      "classification": "branch-isolation identifier disclosure; no observed money error",
      "route": "GET /deductions/:id and mutation responses using detailIn, including POST /deductions/obligations/:id/decision",
      "reproducedEvents": [
        "CARRY_FORWARD",
        "CARRY_SUSPENDED",
        "EXEMPTION_GRANTED",
        "EXEMPTED",
        "DEFERRED_BY_EXEMPTION"
      ],
      "field": "events[].payload.runId",
      "cause": "detailIn redacts deferredPastClosedRunId only; the generic runId in ledger/exemption events is returned unchanged.",
      "expectations": "Keep request access, financial effects, stored event evidence and in-scope/company references. Redact hidden references using the employee membership snapshot rule before returning any event-bearing view.",
      "preExisting": "Event-producing functions are unchanged from 162d50e and 2ba6575 by AST body comparison. No old-code runtime executed; the live disclosure was reproduced on target 622b637."
    }
  ],
  "closure": {
    "id": "CR33-B01",
    "closed": true,
    "evidence": "Unmodified Round33 independent suite 10/10; allowance APPROVED/PAID cancellation retains 409, hides foreign run ID, preserves company ID and leaves ledger unchanged."
  },
  "notes": {
    "finance": "Bonus 123.45 produces net 9123.45 on salary 9000; deduction 67.89 produces 8932.11. Carry of 2500 across two salary-1000 payrolls collects 2000, leaves 500, each net 0. Exemption DROP/DEFER_ONE_PERIOD of 123.45 changes net 8876.55 to 9000, collected 0; deferred child is exactly 123.45.",
    "self": "Employee own bonuses/deductions mine retains run references; privileged branch-current reader loses foreign snapshot references in obligation fields.",
    "guards": "Both direct and exempted ledger reservation guards executed on real disposable SQL transactions: 409 PAYRUN-OBLIGATION-RESERVED, no foreign payroll number, row unchanged.",
    "limitations": [
      "No full integration/unit suite in this round.",
      "No browser/UI execution.",
      "No legacy-missing-period bonus label fixture independently forced.",
      "Closed-period guard for resumed installments inspected but historical runtime hits the earlier past-period guard.",
      "No migration run and no native SQL Server 2019 instance used."
    ],
    "performanceMeasured": false,
    "productModified": false,
    "oldTestsModified": false,
    "companyDatabasesWritten": false,
    "servicesStartedOrStopped": false,
    "oldRuntimeExecuted": false
  },
  "staticChecks": {
    "target": "622b6377809d233b74a2dc57a19bdbd646ca86c0",
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
}
