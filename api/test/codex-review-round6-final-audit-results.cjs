module.exports = {
  "checkedAt": "2026-09-26T04:30:18.654Z",
  "head": "508480b56ece08e2c72381bf040c39296a937523",
  "databaseCount": 4,
  "databases": [
    {
      "name": "hr_codex_r5boundaries_test_3e2ff3fa418f901c",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r6requests_test_1afb4c9edb425e50",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_recovery_test_4e38725e48bf4993",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_settings_test_ddc6f2170d0b311f",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/requests/requests.service.ts",
      "sha256": "6fc715ff275e878916dc1c407a01c881df8e584ed4624c7dd8d56375fb0492bd",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "originalRound5Changed": [],
  "secretScan": {
    "files": 13,
    "filesWithMatches": []
  },
  "staticChecks": {
    "api": "tsc --noEmit --incremental false: exit 0",
    "frontend": "Not rerun: no frontend product change"
  },
  "performanceMeasured": false
}
