module.exports = {
  "target": "84f26e8ecf9f1bf311169a14561a22d8c2f5a3b2",
  "comparedProductRange": "f7a184e..84f26e8",
  "counts": {
    "tests": 97,
    "passed": 94,
    "failed": 3
  },
  "executions": [
    {
      "file": "codex-review-round26-results-previous.cjs",
      "selected": [
        "codex-review-round25-boundaries",
        "codex-review-round25-correction-edges",
        "codex-review-round25-exemption-edges",
        "codex-review-round25-ui",
        "codex-review-round24-exemptions",
        "codex-review-round24-mutations"
      ],
      "counts": {
        "tests": 39,
        "failed": 0,
        "passed": 39,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 39,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round26-results-affected.cjs",
      "selected": [
        "payroll-corrections",
        "payroll-run-membership-moves",
        "payroll-financial-exemptions",
        "payroll-response-leaks",
        "payroll-run-definition",
        "codex-review-round26-ui"
      ],
      "counts": {
        "tests": 54,
        "failed": 0,
        "passed": 54,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 54,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round26-results-independent.cjs",
      "selected": [
        "codex-review-round26-independent"
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
          "file": "codex-review-round26-independent.integration.cjs",
          "name": "CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption",
          "error": "The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n"
        },
        {
          "file": "codex-review-round26-independent.integration.cjs",
          "name": "CR26 dated organisation must govern the carried exemption just as it governs supplementary membership",
          "error": "Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n"
        },
        {
          "file": "codex-review-round26-independent.integration.cjs",
          "name": "CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event",
          "error": "The parent payroll event must apply the same reference redaction as the exemption event"
        }
      ]
    }
  ],
  "rawSerializersComparedWithPreviousCommit": [
    {
      "name": "describePayrollRunCorrection",
      "unchanged": true,
      "sha256": "20ed1daec13f38fa5fa683ee0deff92acf20e24121c9f6d6918cb08fd2bb4ecb"
    },
    {
      "name": "describePayrollItemReversal",
      "unchanged": true,
      "sha256": "a57d157769d83e58989a7790ab171848b8fac0877d20f0cd910e812713778b90"
    }
  ],
  "notes": {
    "runtimeTarget": "84f26e8",
    "oldRuntimeExecuted": false,
    "fullResponseCheck": "Actual HTTP correction and reversal bodies compared by deep equality to unchanged raw serializers on the same disposable data.",
    "directFixtureUpdates": "Employee placement was prepared on the disposable database; the dated case also uses appendEmployeeOrgCalendar in a transaction. Payroll and exemption actions use the guarded API.",
    "performanceMeasured": false
  },
  "staticChecks": {
    "target": "84f26e8ecf9f1bf311169a14561a22d8c2f5a3b2",
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
