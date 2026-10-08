module.exports = {
  "target": "a10dd97f518a7253eff48aa37553c4b5a1f9e816",
  "note": "Passing disclosure tests assert the observed defect, not its repair. Earlier failed fixture preparations remain in result artifacts for traceability.",
  "proofs": [
    {
      "id": "P5A-E01",
      "file": "codex-review-p5a-results-expense-http-proof.cjs",
      "test": {
        "file": "codex-review-p5a-expenses.integration.cjs",
        "name": "P5A-E01: expense money from an auto-approve chain without a reviewer",
        "ms": 8622.5945,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-E01\",\"money\":123,\"ledgerRows\":1,\"humanApprovals\":0}"
    },
    {
      "id": "P5A-C01",
      "file": "codex-review-p5a-results-financial-proof.cjs",
      "test": {
        "file": "codex-review-p5a-compensation.integration.cjs",
        "name": "P5A-C01: compensation exposes moved department identity",
        "ms": 9063.0364,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-C01\",\"foreignDepartmentId\":2,\"leaked\":true}"
    },
    {
      "id": "P5A-C02",
      "file": "codex-review-p5a-results-financial-proof.cjs",
      "test": {
        "file": "codex-review-p5a-compensation.integration.cjs",
        "name": "P5A-C02: prior line adjuster can approve after another edit",
        "ms": 225.8702,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-C02\",\"blockedBeforeSecondEdit\":true,\"previousAuthorApproved\":true}"
    },
    {
      "id": "P5A-R01",
      "file": "codex-review-p5a-results-independent4.cjs",
      "test": {
        "file": "codex-review-p5a-reports.integration.cjs",
        "name": "P5A-R01: confidential definition is still included by builder",
        "ms": 9225.1876,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-R01\",\"confidentialDefinition\":true,\"exportedRows\":1}"
    },
    {
      "id": "P5A-F01",
      "file": "codex-review-p5a-results-independent2.cjs",
      "test": {
        "file": "codex-review-p5a-feedback.integration.cjs",
        "name": "P5A-F01: close does not serialize with feedback response",
        "ms": 9929.2114,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-F01\",\"closeStatus\":200,\"counts\":[3,4],\"inferredRating\":5}"
    },
    {
      "id": "P5A-F02",
      "file": "codex-review-p5a-results-independent2.cjs",
      "test": {
        "file": "codex-review-p5a-feedback.integration.cjs",
        "name": "P5A-F02: optional comment below minimum is published",
        "ms": 9.3286,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-F02\",\"responses\":4,\"comments\":1}"
    },
    {
      "id": "P5A-F03",
      "file": "codex-review-p5a-results-independent2.cjs",
      "test": {
        "file": "codex-review-p5a-feedback.integration.cjs",
        "name": "P5A-F03: calendar changes its default shape",
        "ms": 64.0031,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-F03\",\"featureOff\":true,\"addedMeetings\":true}"
    },
    {
      "id": "P5A-M01",
      "file": "codex-review-p5a-results-independent3.cjs",
      "test": {
        "file": "codex-review-p5a-mobile.integration.cjs",
        "name": "P5A-M01: accepted mobile punch is attached to a different fingerprint owner",
        "ms": 9055.1652,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-M01\",\"status\":201,\"ownPunches\":0,\"otherEmployeePunches\":1}"
    },
    {
      "id": "P5A-S01",
      "file": "codex-review-p5a-results-schedule-proof.cjs",
      "test": {
        "file": "codex-review-p5a-schedule.integration.cjs",
        "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
        "ms": 10800.9495,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-S01\",\"featureOff\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"settingStatus\":500}"
    },
    {
      "id": "P5A-G01",
      "file": "codex-review-p5a-results-migrations.cjs",
      "test": {
        "file": "codex-review-p5a-migrations.integration.cjs",
        "name": "P5A-G01: all 41 migrations accept synchronized shape and refuse malformed owned shape",
        "ms": 39860.1524,
        "pass": true,
        "skip": false
      },
      "diagnostic": "{\"id\":\"P5A-G01\",\"migrations\":41,\"malformedRejected\":41}"
    }
  ]
}
