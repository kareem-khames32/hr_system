module.exports = {
  "target": "fbe5a18eb9ada258b67a39905d6226be4a12838f",
  "base": "9299eee",
  "verdict": {
    "B4_8": "لا أوافق",
    "phase4": "لا أوافق",
    "B4_1ThroughB4_7": "unchanged approvals"
  },
  "blockers": [
    {
      "id": "P4D-B01",
      "continues": "P4C-B01",
      "tests": [
        "P4D-X01",
        "P4D-X02",
        "P4D-X03"
      ]
    },
    {
      "id": "P4D-B02",
      "tests": [
        "P4D-X04"
      ]
    }
  ],
  "closed": {
    "originalExamples": [
      "P4D-S01",
      "P4D-S02",
      "P4D-S03"
    ],
    "installments": "P4D-P02",
    "earlierControls": [
      "P4D-D01",
      "P4D-D02",
      "P4D-D03",
      "P4D-N01",
      "P4D-P01",
      "P4D-R01",
      "P4D-R02"
    ]
  },
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
        "tests": 45,
        "failed": 0,
        "passed": 45,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 45,
        "suites": 0
      }
    },
    "independent": [
      {
        "file": "codex-review-p4d-export.integration.cjs",
        "name": "P4D-D01: canonical confidential request and requestId-linked rows stay out",
        "ms": 11985.8604,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-export.integration.cjs",
        "name": "P4D-D02: export holds employee scope until final read, so a branch transfer waits",
        "ms": 959.4824,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-export-derived.integration.cjs",
        "name": "P4D-D03: confidential executed request and obligation omitted; public control remains visible",
        "ms": 13321.1239,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-export-locks.integration.cjs",
        "name": "P4D-N01: real export deadlock retries successfully with one committed audit",
        "ms": 14368.7371,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-closures.integration.cjs",
        "name": "P4D-S01: confidential dependent removal copies reason onto an existing unlinked row",
        "ms": 11833.9333,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-closures.integration.cjs",
        "name": "P4D-S02: confidential custody loss copies description onto the old assignment",
        "ms": 214.4383,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-closures.integration.cjs",
        "name": "P4D-S03: confidential archive request copies its reason into the exported employee",
        "ms": 152.4752,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-export-controls.integration.cjs",
        "name": "P4D-P01: current parent request confidentiality hides both offboarding and closed employment period",
        "ms": 11089.7129,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-export-controls.integration.cjs",
        "name": "P4D-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three",
        "ms": 483.2528,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-export-controls.integration.cjs",
        "name": "P4D-P02: public loan installments exported; confidential parent and foreign owner excluded",
        "ms": 264.1592,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-export-controls.integration.cjs",
        "name": "P4D-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision",
        "ms": 262.3541,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-text-bypasses.integration.cjs",
        "name": "P4D-X01: real dependent destination normalizes whitespace and defeats confidential text matching",
        "ms": 11161.7707,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-text-bypasses.integration.cjs",
        "name": "P4D-X02: three-letter sensitive narrative is copied by the real destination and not scrubbed",
        "ms": 222.6027,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-text-bypasses.integration.cjs",
        "name": "P4D-X03: free-text custody condition is not a narrative key; a one-word description leaks",
        "ms": 188.7491,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4d-text-race.integration.cjs",
        "name": "P4D-X04: a confidential request commits after the text snapshot and before exporting its copied custody field",
        "ms": 9388.3369,
        "pass": true,
        "skip": false
      }
    ],
    "units": {
      "script": "codex-review-p4d-units.cjs",
      "passed": 6,
      "failed": 0,
      "source": "Successful node:test stdout captured in review tool session; includes EPU-01 through EPU-06"
    },
    "staticChecks": {
      "target": "fbe5a18eb9ada258b67a39905d6226be4a12838f",
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
  "interpretation": "X01-X04 pass by reproducing confidentiality failures; all other independent cases assert closure or regression controls. Passing detection tests is not product approval.",
  "sourceAudit": {
    "alternateSubjects": [
      "toEmployeeId: custody transfer creates a requestId-linked assignment, so the existing row filter covers it",
      "withEmployeeId: shift swap records requestId-linked history; no copied payload narrative found in exported tables"
    ],
    "projection": "Employee and section rows use the scrubber; metadata added later consists of static labels, counts, employee id and export timestamp.",
    "scope": "Only this diff reviewed; approved B4.1-B4.7 unchanged."
  },
  "reproduce": [
    "$env:REVIEW_PRELOAD='codex-review-p4d-lfsql-preload.cjs'",
    "$env:REVIEW_RESULT_SUFFIX='recheck'",
    "node api/test/codex-review-p4d-suite.cjs codex-review-p4d-export codex-review-p4d-export-derived codex-review-p4d-export-locks codex-review-p4d-closures codex-review-p4d-export-controls codex-review-p4d-text-bypasses codex-review-p4d-text-race",
    "node api/test/codex-review-p4d-units.cjs",
    "node api/test/codex-review-p4d-static.cjs"
  ],
  "limits": [
    "No full suite or mutation run",
    "No browser review",
    "Unchanged payroll and leave evidence not repeated"
  ]
}
