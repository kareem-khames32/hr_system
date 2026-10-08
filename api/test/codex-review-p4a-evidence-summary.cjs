module.exports = {
  "target": "6f5964c",
  "baseline": "456e544",
  "existingIntegrationFiles": 33,
  "existingIntegrationTests": 175,
  "independentTests": {
    "tests": 6,
    "failed": 0,
    "passed": 6,
    "cancelled": 0,
    "skipped": 0,
    "todo": 0,
    "topLevel": 6,
    "suites": 0
  },
  "unitAndBaselineChecks": 79,
  "typechecks": [
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
  ],
  "findings": [
    {
      "id": "P4A-B01",
      "batches": [
        "B4.4",
        "B4.5"
      ],
      "tests": [
        "P4A-F01",
        "P4A-F02"
      ],
      "classification": "blocker",
      "observed": "Enabled through API after verifying a successor. Historical payroll approved with unverified table and 1482.50 tax; overtime used unverified 2.00 multiplier instead of company 1.50."
    },
    {
      "id": "P4A-B02",
      "batches": [
        "B4.4"
      ],
      "tests": [
        "P4A-F03"
      ],
      "classification": "blocker",
      "observed": "Cancelled August CALCULATED run remained in approved September tax snapshot: 1024.16 vs 1482.50 control."
    },
    {
      "id": "P4A-B03",
      "batches": [
        "B4.5"
      ],
      "tests": [
        "P4A-L01"
      ],
      "classification": "blocker",
      "observed": "Employee moved EG to SA before lock. Historical entitlement and carry 30 vs 15 on reference."
    },
    {
      "id": "P4A-B04",
      "batches": [
        "B4.8"
      ],
      "tests": [
        "P4A-D01"
      ],
      "classification": "blocker",
      "observed": "Canonical LEAVE with confidential LEAVE_ANNUAL definition masked by request endpoint but exported with original reason."
    },
    {
      "id": "P4A-B05",
      "batches": [
        "B4.8"
      ],
      "tests": [
        "P4A-D02"
      ],
      "classification": "blocker",
      "observed": "Document added after actual employee transfer to inaccessible branch appears in pending export; subsequent export 404."
    }
  ],
  "normalization": "SQL CRLF normalized to Git LF in memory by lfsql-preload; existing tests and migrations unchanged. All six initial failures disappeared on corrected transport.",
  "reviewBoundaries": [
    "No browser review",
    "No full integration run",
    "No legal-number certification",
    "Phase 2/3 deferred notes remain nonblocking for these changes"
  ],
  "files": [
    "attendance-payroll-race.integration.cjs",
    "banks.integration.cjs",
    "cost-center-report.integration.cjs",
    "data-protection.integration.cjs",
    "eg-salary-tax.integration.cjs",
    "employee-export.integration.cjs",
    "employee-privacy.integration.cjs",
    "employee-suspension.integration.cjs",
    "eos-country.integration.cjs",
    "financial-report.integration.cjs",
    "fulltest-employees-attendance.integration.cjs",
    "gosi-tracks.integration.cjs",
    "hijri-display.integration.cjs",
    "leave-contract.integration.cjs",
    "leave-entitlement-tiers.integration.cjs",
    "leave-year-end.integration.cjs",
    "legal-entities-migration.integration.cjs",
    "legal-entities.integration.cjs",
    "overtime-legal-minimum.integration.cjs",
    "payroll-bonuses.integration.cjs",
    "payroll-corrections.integration.cjs",
    "payroll-daily-accrual.integration.cjs",
    "payroll-reports.integration.cjs",
    "payroll-statutory.integration.cjs",
    "payroll-suspended-archived-settlement.integration.cjs",
    "payroll-typed-deductions.integration.cjs",
    "penalty-fine-cap.integration.cjs",
    "resignation-legal-terms.integration.cjs",
    "salary-items.integration.cjs",
    "saudization-report.integration.cjs",
    "statutory-migration.integration.cjs",
    "statutory-pack.integration.cjs",
    "suspension-paid.integration.cjs"
  ]
}
