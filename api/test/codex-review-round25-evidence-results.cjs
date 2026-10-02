module.exports = {
  "target": "f7a184e2bdcacecdab025194cf905bb8eb677e58",
  "comparison": "31cd394..f7a184e",
  "finalRuns": [
    {
      "file": "codex-review-round25-results-prior-independent.cjs",
      "selected": [
        "codex-review-round24-exemptions",
        "codex-review-round24-mutations",
        "codex-review-round23-exemptions",
        "codex-review-round23-payslips",
        "codex-review-round23-previews"
      ],
      "counts": {
        "tests": 22,
        "failed": 0,
        "passed": 22,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 22,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round25-results-affected.cjs",
      "selected": [
        "payroll-response-leaks",
        "payroll-financial-exemptions",
        "payroll-corrections",
        "payroll-run-definition",
        "payroll-overview-filters",
        "payroll-policy-publish",
        "payroll-policy-snapshot-engine",
        "payroll-suspended-archived-settlement",
        "payroll-approval-chain-disbursement"
      ],
      "counts": {
        "tests": 51,
        "failed": 0,
        "passed": 51,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 51,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round25-results-policy-publish.cjs",
      "selected": [
        "payroll-policy-publish"
      ],
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
      "file": "codex-review-round25-results-boundaries-corrected.cjs",
      "selected": [
        "codex-review-round25-boundaries"
      ],
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
      "file": "codex-review-round25-results-exemption-edges.cjs",
      "selected": [
        "codex-review-round25-exemption-edges"
      ],
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
      "file": "codex-review-round25-results-correction-final-v2.cjs",
      "selected": [
        "codex-review-round25-correction-edges"
      ],
      "counts": {
        "tests": 4,
        "failed": 3,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "file": "codex-review-round25-correction-edges.integration.cjs",
          "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
          "error": "Foreign child net must not leak through correction.children"
        },
        {
          "file": "codex-review-round25-correction-edges.integration.cjs",
          "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
          "error": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n"
        },
        {
          "file": "codex-review-round25-correction-edges.integration.cjs",
          "name": "CR25 an old payslip must not reveal a paid supplementary item recorded in another branch",
          "error": "A branch reader must not receive the foreign supplementary item through the old payslip"
        }
      ]
    },
    {
      "file": "codex-review-round25-results-ui.cjs",
      "selected": [
        "codex-review-round25-ui"
      ],
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
    }
  ],
  "finalUniqueCounts": {
    "tests": 107,
    "passed": 104,
    "failed": 3
  },
  "findingTests": [
    {
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "file": "codex-review-round25-correction-edges.integration.cjs"
    },
    {
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "file": "codex-review-round25-correction-edges.integration.cjs"
    },
    {
      "name": "CR25 an old payslip must not reveal a paid supplementary item recorded in another branch",
      "file": "codex-review-round25-correction-edges.integration.cjs"
    }
  ],
  "earlierAttemptsPreserved": {
    "results-boundaries": "Test fixture initially used BRANCH instead of documented lowercase branch; corrected only the new round25 test.",
    "results-correction-final": "Test initially expected 403 for a hidden item; item endpoint correctly returns 404. Updated only the new round25 assertion, then reproduced the actual supplementary-data leak.",
    "results-correction-edges": "First reproduction of the two blockers, before adding the payslip follow-up."
  },
  "sourceInspection": {
    "reversalLedgerUnchangedFrom31cd394": true,
    "previousForwardCalledApply": true,
    "runtimeBaselineExecuted": false,
    "distinction": "Existing code provenance read in git; all runtime reproductions ran at f7a184e. No claim that either defect was newly introduced."
  },
  "staticChecks": {
    "target": "f7a184e2bdcacecdab025194cf905bb8eb677e58",
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
  },
  "performanceMeasured": false
}
