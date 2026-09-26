module.exports = {
  "checkedAt": "2026-09-26T17:28:26.256Z",
  "head": "601bc5359877dfb73a1c77b893361c43e501d369",
  "databaseCount": 6,
  "databases": [
    {
      "name": "hr_attendance_proof_test_ebf5f09b2c93df37",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r7holiday_test_aaf0e69c38488da8",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r8boundaries_test_3d4f87000c69f80e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r8limit_test_2176a2da5409ce1e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_holiday_work_test_23833ec84aabdd0c",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_public_holiday_audience_test_8389fde812bcc07a",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/attendance/holiday-work.service.ts",
      "sha256": "6120740631006ecfaa3552046e5f91cb9458f689cf04422d462809c06d823a7a",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/payroll-live-schedule-provider.ts",
      "sha256": "142032a7474d255204516cecd03d2408f1f72aeeed28766f8727a04795c3cd38",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "priorEvidenceChanged": [],
  "secretScan": {
    "files": 11,
    "filesWithMatches": []
  },
  "staticChecks": {
    "api": "tsc --noEmit --incremental false: exit 0",
    "frontend": "Not rerun: no frontend change in this round"
  },
  "performanceMeasured": false
}
