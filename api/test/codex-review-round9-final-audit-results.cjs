module.exports = {
  "checkedAt": "2026-09-26T21:28:25.816Z",
  "head": "62b1694e123f2aadb50c1dbbd85a8e4948096a50",
  "databaseCount": 9,
  "databases": [
    {
      "name": "hr_attendance_proof_test_469166fb594cef95",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r7holiday_test_e02688ad8236ec5a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r8boundaries_test_2b1408a034ca54e3",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r8limit_test_0c74ddac513a5aee",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r9privacy_test_7439dbe6dc4df4ac",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r9search_test_340ffa3750231978",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r9search_test_6ebf0040efe59f46",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_holiday_work_test_1024a7b9ddcfd856",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_public_holiday_audience_test_e319374430775fdc",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/attendance/holiday-work.service.ts",
      "sha256": "5bc6248ae0cb3a0bcd4db1dc934fcd012d444e1d36aa45e00e311238c0a2a35b",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/payroll-live-schedule-provider.ts",
      "sha256": "41bb7df643824f1dd23e259c18ee1335dc183c958542ac48b445ab3caa98ddbc",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "priorEvidenceChanged": [],
  "secretScan": {
    "files": 12,
    "filesWithMatches": []
  },
  "staticChecks": {
    "api": "tsc --noEmit --incremental false: exit 0",
    "frontend": "Not rerun: no frontend change in this round"
  },
  "performanceMeasured": false
}
