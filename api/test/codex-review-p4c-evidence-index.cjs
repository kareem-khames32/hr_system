module.exports = {
  "target": "e1df9d59edd483069480bbb02fb1ba745b19b0f9",
  "base": "aa88c14",
  "verdict": {
    "B4_8": "لا أوافق",
    "phase4": "لا أوافق",
    "previousB4_1ThroughB4_7": "unchanged approvals"
  },
  "blocker": {
    "id": "P4C-B01",
    "continues": [
      "P4B-B01",
      "P4A-B04"
    ],
    "evidence": [
      "P4C-S01",
      "P4C-S02",
      "P4C-S03"
    ]
  },
  "note": {
    "id": "P4C-N02",
    "evidence": [
      "P4C-P02"
    ],
    "description": "Existing public loan installments omitted because the export requires employeeId on their table."
  },
  "oldClosures": [
    "P4C-D01",
    "P4C-D02",
    "P4C-D03",
    "P4C-N01"
  ],
  "affected": {
    "selected": [
      "employee-privacy",
      "employee-export",
      "employment-periods",
      "employment-periods-migration",
      "fulltest-employees-attendance"
    ],
    "counts": {
      "tests": 43,
      "failed": 0,
      "passed": 43,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 43,
      "suites": 0
    }
  },
  "independent": [
    {
      "file": "codex-review-p4c-export.integration.cjs",
      "name": "P4C-D01: canonical confidential request and requestId-linked rows stay out",
      "ms": 9906.6202,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export.integration.cjs",
      "name": "P4C-D02: export holds employee scope until final read, so a branch transfer waits",
      "ms": 860.2251,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-derived.integration.cjs",
      "name": "P4C-D03: confidential executed request and obligation omitted; public control remains visible",
      "ms": 10099.8579,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-locks.integration.cjs",
      "name": "P4C-N01: real export deadlock retries successfully with one committed audit",
      "ms": 10898.5496,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S01: confidential dependent removal copies reason onto an existing unlinked row",
      "ms": 10460.62,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S02: confidential custody loss copies description onto the old assignment",
      "ms": 220.0989,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S03: confidential archive request copies its reason into the exported employee",
      "ms": 150.0566,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-P01: current parent request confidentiality hides both offboarding and closed employment period",
      "ms": 9130.2429,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three",
      "ms": 346.073,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-P02: installment section is skipped even for a public loan because it lacks employeeId",
      "ms": 81.6308,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision",
      "ms": 191.0214,
      "pass": true,
      "skip": false
    }
  ],
  "units": {
    "passed": 5,
    "failed": 0,
    "output": "codex-review-p4c-units.tap"
  },
  "staticChecks": {
    "target": "e1df9d59edd483069480bbb02fb1ba745b19b0f9",
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
  "interpretation": "S01/S02/S03 pass by reproducing confidentiality leaks; P02 passes by reproducing an existing completeness issue. Passing the review suite does not mean product approval.",
  "commands": [
    "$env:REVIEW_PRELOAD='codex-review-p4c-lfsql-preload.cjs'",
    "$env:REVIEW_RESULT_SUFFIX='recheck'",
    "node api/test/codex-review-p4c-suite.cjs codex-review-p4c-export codex-review-p4c-export-derived codex-review-p4c-export-locks codex-review-p4c-updated-sources codex-review-p4c-export-controls",
    "node api/test/codex-review-p4c-units.cjs",
    "node api/test/codex-review-p4c-static.cjs"
  ],
  "limits": [
    "No full suite",
    "No mutation testing",
    "No browser review",
    "Unchanged payroll/overtime/tier evidence not repeated"
  ]
}
