module.exports = {
  "checkedAt": "2026-09-27T13:27:21.443Z",
  "head": "cccffd7c0b5ca2fa1523d69db2935ee76de21409",
  "databaseCount": 5,
  "databases": [
    {
      "name": "hr_administration_level_test_f44351fdee053e42",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r12boundaries_test_42ae94d1d0bbcd4d",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r12money_test_35a94171055421dd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r13boundaries_test_0e914b27adbc3aaf",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_termination_reasons_test_a223e2b37e9561e7",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/offboarding/eos.ts",
      "sha256": "2aa565dbe5139bb595d5d8fac419c476f951a0c97b12c33824f6c48d009ea8a2",
      "unchanged": true
    },
    {
      "file": "api/src/offboarding/offboarding.service.ts",
      "sha256": "62f4339a2a94c8f81da9bf3658d7e2fae3aa123f6c9352d137356b4e01ad6070",
      "unchanged": true
    },
    {
      "file": "api/src/offboarding/termination-reasons.ts",
      "sha256": "1cae09bfda43d0d9fc15a3164ba0a99b87db716df32e0c323d368a70c95e361a",
      "unchanged": true
    },
    {
      "file": "api/src/requests/approver-resolver.service.ts",
      "sha256": "c9f710688b5a51c1e4903b132f313f698c0ea788b5f69e3b1b054fade48cbc8a",
      "unchanged": true
    },
    {
      "file": "src/lib/termination-reasons.ts",
      "sha256": "8ba4c58c8632922ed55af43115716634aff31f6f33c19b87480aa249942c62af",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "priorEvidenceChanged": [],
  "secretScan": {
    "files": 11,
    "filesWithMatches": []
  },
  "temporaryFilesRemaining": [],
  "emptyDirectoryRetained": true,
  "staticChecks": {
    "api": "tsc --noEmit --incremental false: exit 0",
    "frontend": "tsc --noEmit --incremental false: exit 0"
  },
  "performanceMeasured": false
}
