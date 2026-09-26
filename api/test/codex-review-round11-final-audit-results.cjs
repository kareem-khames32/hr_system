module.exports = {
  "checkedAt": "2026-09-26T23:41:35.492Z",
  "head": "b8fbdc97ce12edef602d2fa9dbf83d6acf80832c",
  "databaseCount": 3,
  "databases": [
    {
      "name": "hr_codex_r10independent_test_ddc2e9ffc71dba5a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r11boundaries_test_5f10552978a846dd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_skip_level_test_16777ae3dd0c1024",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/requests/approver-resolver.service.ts",
      "sha256": "1a8a04ce666208265aac9b2084b1d1ba6c35db7c91fc7cfa9bf8ecf3884c43aa",
      "unchanged": true
    },
    {
      "file": "api/src/requests/requests.service.ts",
      "sha256": "ea8fd42fbc35c41c90e5408f81f7cb1d7d0240d030529d3b5761685715590e7d",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "priorEvidenceChanged": [],
  "secretScan": {
    "files": 9,
    "filesWithMatches": []
  },
  "temporaryFilesRemaining": [],
  "emptyDirectoryRetained": true,
  "staticChecks": {
    "api": "tsc --noEmit --incremental false: exit 0",
    "frontend": "Not rerun: no frontend change"
  },
  "performanceMeasured": false
}
