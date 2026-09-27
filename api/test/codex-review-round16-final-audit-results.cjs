module.exports = {
  "checkedAt": "2026-09-27T14:11:27.470Z",
  "head": "a1536d01b8794b79929039ddf24495f7b7e25f10",
  "databaseCount": 10,
  "databases": [
    {
      "name": "hr_administration_level_test_800dd3644dda71c2",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r14messages_test_8615368f5b2c27ad",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r15boundaries_test_f20b9bc855b3f4cb",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r16boundaries_test_cb2f89478dce3567",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_fulltest_payroll_test_a3a78f0dd2c49bb6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_leave_attach_test_def41fbb7a49dfe7",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_leave_sick_pay_test_02a9f8519304e0e5",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_recovery_test_2a5245f6d661b2cd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_recovery_test_d31220a52cca46cb",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_skip_level_test_af8a966c68885d94",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/requests/destinations.service.ts",
      "sha256": "2b84f47383652d735d65abf439e1d220e3a024804fb4e641e3130217e529289b",
      "unchanged": true
    },
    {
      "file": "api/src/requests/requests.service.ts",
      "sha256": "b397b215f0f7ebea498833ef38252560bb8fa95359673e0b8bb7e958870295cc",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "priorEvidenceChanged": [],
  "secretScan": {
    "files": 12,
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
