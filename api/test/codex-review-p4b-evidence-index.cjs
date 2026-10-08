module.exports = {
  "target": "aaa2bad1081eefada4cb0510efed41020346daf1",
  "verdicts": {
    "B4.4": "APPROVE",
    "B4.5": "APPROVE",
    "B4.8": "REJECT",
    "phase4": "REJECT"
  },
  "blocker": {
    "id": "P4B-B01",
    "continues": "P4A-B04",
    "evidence": "P4B-D03",
    "file": "codex-review-p4b-export-derived.integration.cjs"
  },
  "note": {
    "id": "P4B-N01",
    "evidence": "P4B-N01",
    "sqlError": 1205,
    "file": "codex-review-p4b-export-locks.integration.cjs"
  },
  "existing": {
    "files": 14,
    "tests": 100,
    "result": "codex-review-p4b-results-affected.cjs"
  },
  "independent": {
    "tests": 14,
    "results": [
      {
        "file": "codex-review-p4b-tiers-race.integration.cjs",
        "name": "P4B-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
        "ms": 10331.8808,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-export.integration.cjs",
        "name": "P4B-D01: canonical confidential request and requestId-linked rows stay out",
        "ms": 10184.3856,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-export.integration.cjs",
        "name": "P4B-D02: export holds employee scope until final read, so a branch transfer waits",
        "ms": 882.1163,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-export-derived.integration.cjs",
        "name": "P4B-D03: confidential executed request remains visible through sourceRequestId obligation label",
        "ms": 9745.3272,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-export-locks.integration.cjs",
        "name": "P4B-N01: employee export and request execution have opposite employee/request locks",
        "ms": 9499.3076,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tax.integration.cjs",
        "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
        "ms": 10154.9679,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tax.integration.cjs",
        "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
        "ms": 1981.4102,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tax.integration.cjs",
        "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
        "ms": 594.5212,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tax.integration.cjs",
        "name": "P4B-F04: final approval and source reopening serialize in both actual request orders",
        "ms": 3699.1782,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tax.integration.cjs",
        "name": "P4B-F05: reversal after dependent approval removes both historical income and tax from the next calculation",
        "ms": 1738.1141,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tax.integration.cjs",
        "name": "P4B-F06: the final approval-chain step also enforces finalized tax sources",
        "ms": 1103.1692,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-overtime-history.integration.cjs",
        "name": "P4B-O01: both activation and runtime reject historical unverified overtime prices",
        "ms": 9034.5355,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tiers-writers.integration.cjs",
        "name": "P4B-L02: rollover recalculates new-row country after waiting for employee",
        "ms": 8706.0712,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p4b-tiers-writers.integration.cjs",
        "name": "P4B-L03: daily renewal uses birthday committed before employee lock",
        "ms": 153.8491,
        "pass": true,
        "skip": false
      }
    ]
  },
  "units": {
    "tests": 82,
    "baseline": "456e544",
    "salaryItems": 500
  },
  "checks": {
    "target": "aaa2bad1081eefada4cb0510efed41020346daf1",
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
  "setupCorrections": "Early P4B tax runs incorrectly expected a JSON error code and then enabled an already-enabled calculator; corrected only our evidence. Final tests pass. No product changes.",
  "reproduction": {
    "env": {
      "REVIEW_PRELOAD": "codex-review-p4b-lfsql-preload.cjs",
      "REVIEW_RESULT_SUFFIX": "rerun"
    },
    "command": "node api/test/codex-review-p4b-suite.cjs codex-review-p4b-tax codex-review-p4b-overtime-history codex-review-p4b-tiers-race codex-review-p4b-tiers-writers codex-review-p4b-export codex-review-p4b-export-derived codex-review-p4b-export-locks"
  }
}
