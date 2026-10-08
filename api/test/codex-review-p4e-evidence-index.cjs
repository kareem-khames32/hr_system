module.exports = {
  "target": "25cbef0d601f79e0e772430a5b40d996fe96cd2a",
  "base": "eb87928",
  "verdict": {
    "B4_8": "أوافق على التشغيل",
    "phase4": "أوافق على التشغيل",
    "B4_1ThroughB4_7": "unchanged approvals; B4.7 is documented deferral only"
  },
  "closures": [
    {
      "id": "P4D-B01",
      "state": "اتقفل",
      "tests": [
        "P4E-X01",
        "P4E-X02",
        "P4E-X03",
        "P4E-S01",
        "P4E-S02",
        "P4E-S03"
      ]
    },
    {
      "id": "P4D-B02",
      "state": "اتقفل",
      "tests": [
        "P4E-X04a",
        "P4E-X04b"
      ]
    }
  ],
  "notes": [
    {
      "id": "P4E-N01",
      "blocking": false,
      "description": "EPU-07 assumes an unspecified metadata length is 255, omitting five simple-json columns from its classification requirement; SQL Server driver maps simple-json to ntext.",
      "evidence": "codex-review-p4e-field-coverage.cjs"
    }
  ],
  "tests": {
    "affected": {
      "selected": [
        "employee-privacy",
        "employee-export",
        "employment-periods",
        "employment-periods-migration",
        "fulltest-employees-attendance"
      ],
      "counts": {
        "tests": 47,
        "failed": 0,
        "passed": 47,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 47,
        "suites": 0
      }
    },
    "independent": [
      {
        "file": "codex-review-p4e-export.integration.cjs",
        "name": "P4E-D01: canonical confidential request and requestId-linked rows stay out",
        "ms": 12268.6029,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-export.integration.cjs",
        "name": "P4E-D02: export holds employee scope until final read, so a branch transfer waits",
        "ms": 911.8645,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-export-derived.integration.cjs",
        "name": "P4E-D03: confidential executed request and obligation omitted; public control remains visible",
        "ms": 12672.3919,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-export-locks.integration.cjs",
        "name": "P4E-N01: real export deadlock retries successfully with one committed audit",
        "ms": 15761.6033,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-closures.integration.cjs",
        "name": "P4E-S01: confidential dependent removal copies reason onto an existing unlinked row",
        "ms": 12315.3275,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-closures.integration.cjs",
        "name": "P4E-S02: confidential custody loss copies description onto the old assignment",
        "ms": 263.4743,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-closures.integration.cjs",
        "name": "P4E-S03: confidential archive request copies its reason into the exported employee",
        "ms": 152.8356,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-export-controls.integration.cjs",
        "name": "P4E-P01: current parent request confidentiality hides both offboarding and closed employment period",
        "ms": 11861.2033,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-export-controls.integration.cjs",
        "name": "P4E-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three",
        "ms": 496.2956,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-export-controls.integration.cjs",
        "name": "P4E-P02: public loan installments exported; confidential parent and foreign owner excluded",
        "ms": 238.3635,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-export-controls.integration.cjs",
        "name": "P4E-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision",
        "ms": 261.9887,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-text-controls.integration.cjs",
        "name": "P4E-X01: real dependent destination normalizes whitespace and remains redacted after whitespace normalization",
        "ms": 11556.7582,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-text-controls.integration.cjs",
        "name": "P4E-X02: three-letter sensitive narrative is copied by the real destination and redacted",
        "ms": 285.4172,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-text-controls.integration.cjs",
        "name": "P4E-X03: free-text custody condition is not a narrative key; a one-word description is redacted",
        "ms": 222.5365,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-text-race.integration.cjs",
        "name": "P4E-X04a: final secret read follows a concurrent confidential custody effect",
        "ms": 10452.3708,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4e-text-race.integration.cjs",
        "name": "P4E-X04b: request after final secret read cannot change already-read section data",
        "ms": 256.8183,
        "pass": true,
        "skip": false
      }
    ],
    "units": {
      "script": "codex-review-p4e-units.cjs",
      "passed": 7,
      "failed": 0,
      "output": "codex-review-p4e-units.tap"
    },
    "staticChecks": {
      "target": "25cbef0d601f79e0e772430a5b40d996fe96cd2a",
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
  "reviewOnlyHarnessCorrection": "Initial metadata/unit helper lacked a synthetic JWT_SECRET when importing AppModule; the helper was corrected and rerun. No product file or existing test was changed.",
  "sourceAudit": {
    "fields": {
      "textColumns": 213,
      "free": 39,
      "unclassifiedJson": [
        {
          "table": "attendance_days",
          "column": "attendanceRuleSnapshot",
          "type": "simple-json",
          "length": 255,
          "category": "other"
        },
        {
          "table": "overtime_entries",
          "column": "calculationSnapshot",
          "type": "simple-json",
          "length": 255,
          "category": "other"
        },
        {
          "table": "hr_issued_documents",
          "column": "snapshot",
          "type": "simple-json",
          "length": 255,
          "category": "other"
        },
        {
          "table": "letter_requests",
          "column": "contentSnapshot",
          "type": "simple-json",
          "length": 255,
          "category": "other"
        },
        {
          "table": "offboarding_cases",
          "column": "settlementFinancialSnapshot",
          "type": "simple-json",
          "length": 255,
          "category": "other"
        }
      ]
    },
    "freeText": "Destination copies to dependent removal, custody condition, employee archive reason, obligation labels, histories and other listed narrative fields are covered by field masking or source-request row omission.",
    "structured": "Job-title, address, identity and bank writers copy canonical field values. Settlement obligation snapshots contain id/type/amount, not obligation label. Letter rows carry requestId; issued HR-document custom values are manual, not copied by a request destination.",
    "alternateSubjects": [
      "toEmployeeId: custody transfer persists requestId on the recipient assignment",
      "withEmployeeId: shift swap history carries requestId; exported copied request prose was not found"
    ],
    "ordering": "Request insertion precedes execution in the engine or is committed in the same transaction. Executed requests cannot enter the RETURNED_FOR_INFO-only payload-edit path. Export masks after all employee/section reads.",
    "projection": "Only static metadata, counts, ids and export timestamp are added after guarded employee and section projection."
  },
  "reproduction": [
    "$env:REVIEW_PRELOAD='codex-review-p4e-lfsql-preload.cjs'",
    "$env:REVIEW_RESULT_SUFFIX='recheck'",
    "node api/test/codex-review-p4e-suite.cjs codex-review-p4e-export codex-review-p4e-export-derived codex-review-p4e-export-locks codex-review-p4e-closures codex-review-p4e-export-controls codex-review-p4e-text-controls codex-review-p4e-text-race",
    "node api/test/codex-review-p4e-units.cjs",
    "node api/test/codex-review-p4e-field-audit.cjs",
    "node api/test/codex-review-p4e-static.cjs"
  ],
  "limits": [
    "No full suite or mutation run",
    "No browser review",
    "Unchanged payroll and leave evidence not repeated"
  ]
}
