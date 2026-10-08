module.exports = {
  "target": "6113feeddd57dc71d20f8de8d3b0de4a36e4aaf7",
  "base": "403347cb",
  "fix": "ac6aff93",
  "authoritative": {
    "independent": "codex-review-p5d-results-final.cjs",
    "regressions": "codex-review-p5d-results-regression.cjs",
    "baseline": "codex-review-p5d-results-baseline-verified.cjs",
    "units": "codex-review-p5d-unit-results.cjs",
    "typescript": "codex-review-p5d-static-checks.cjs"
  },
  "scope": {
    "productFilesChanged": 0,
    "existingTestsChanged": 0,
    "temporaryDatabasesOnly": true,
    "noRealSMTP": true,
    "noRealLDAP": true,
    "noListeningPorts": true
  },
  "findings": [
    {
      "id": "P5C-B01",
      "state": "receipt path closed",
      "evidence": [
        "P5D-E11",
        "P5D-E12"
      ],
      "test": "receipt-pool"
    },
    {
      "id": "P5D-B01",
      "classification": "blocker",
      "state": "structural resolver borrows another connection inside expense submission",
      "calls": [
        1322,
        1326,
        1332,
        1360,
        1399
      ],
      "file": "api/src/requests/requests.service.ts",
      "evidence": [
        "P5D-T01"
      ],
      "test": "expense-transitive"
    },
    {
      "id": "P5D-N01",
      "classification": "note",
      "state": "SQL deadlocks in human approval lookup across independent final approvals; rollback and serial retries checked for expense and travel",
      "evidence": [
        "P5D-T02"
      ],
      "test": "expense-transitive"
    },
    {
      "id": "P5D-N02",
      "classification": "note outside B5.3; preexisting shared-engine readers",
      "calls": [
        864,
        1248
      ],
      "file": "api/src/requests/requests.service.ts",
      "preexisting": [
        {
          "name": "maxBackdateDays",
          "unchangedSincePhase4": true
        },
        {
          "name": "assertSufficient",
          "unchangedSincePhase4": true
        }
      ],
      "evidence": [
        "P5D-L04",
        "P5D-L05"
      ],
      "test": "calendar-pool"
    }
  ],
  "calendarParity": {
    "evidence": [
      "P5D-L01",
      "P5D-L02",
      "P5D-L03"
    ],
    "totalDays": 8,
    "workingDays": 5,
    "yearSplit": {
      "2026": 3,
      "2027": 2
    },
    "fullPool": "10 held connections; all changed calendar paths return 201"
  },
  "regressionException": {
    "test": "fulltest-leaves-payroll / ZZ",
    "failedChecks": 2,
    "reason": "overtime hours/amount and payslip line absent under review harness",
    "baselineLoadedInMemory": true,
    "sameOnBeforeFix": true
  },
  "exploratoryResults": "Earlier result files preserve fixture/setup corrections and diagnostic runs. Only authoritative files above supply final counts. No failed product assertion is silently replaced: T01/L04/L05 intentionally assert the defect; T02 asserts database error, rollback and safe retry."
}
