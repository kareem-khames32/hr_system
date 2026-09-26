module.exports = {
  "selected": [
    "codex-review-round4-edges",
    "codex-review-round4-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 13979.5532
  },
  "results": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 request card masks confidential records and must not reveal the new foreign organization after transfer",
      "ms": 3362.8042,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 3798.3002,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ {\n+   attendanceExempt: false,\n+   attendanceReviewReason: null,\n+   attendanceReviewRequired: false,\n+   attendanceRuleSnapshot: null,\n+   branchId: 1,\n+   checkIn: null,\n+   checkOut: null,\n+   computedAt: '2026-09-26T03:42:48.003Z',\n+   countedWorkMinutes: null,\n+   date: '2026-09-15',\n+   deductibleMinutes: 0,\n+   earlyArrivalMinutes: null,\n+   earlyLeaveMinutes: 0,\n+   employeeId: 2,\n+   excusedMinutes: 0,\n+   exemption: null,\n+   flexOutcome: null,\n+   graceUsed: null,\n+   hasShortfall: false,\n+   id: 1,\n+   lateMinutes: 0,\n+   leaveConflict: false,\n+   manualReason: null,\n+   punchAnomalies: null,\n+   punchSource: null,\n+   rawLateMinutes: null,\n+   scheduleSource: 'none',\n+   shiftEnd: '',\n+   shiftId: null,\n+   shiftName: 'بلا وردية',\n+   shiftStart: '',\n+   shortfallMinutes: null,\n+   status: 'absent',\n+   unexcusedLateMinutes: null,\n+   unscheduled: true,\n+   workMinutes: 0\n+ }\n- undefined\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ {\n+   attendanceExempt: false,\n+   attendanceReviewReason: null,\n+   attendanceReviewRequired: false,\n+   attendanceRuleSnapshot: null,\n+   branchId: 1,\n+   checkIn: null,\n+   checkOut: null,\n+   computedAt: '2026-09-26T03:42:48.003Z',\n+   countedWorkMinutes: null,\n+   date: '2026-09-15',\n+   deductibleMinutes: 0,\n+   earlyArrivalMinutes: null,\n+   earlyLeaveMinutes: 0,\n+   employeeId: 2,\n+   excusedMinutes: 0,\n+   exemption: null,\n+   flexOutcome: null,\n+   graceUsed: null,\n+   hasShortfall: false,\n+   id: 1,\n+   lateMinutes: 0,\n+   leaveConflict: false,\n+   manualReason: null,\n+   punchAnomalies: null,\n+   punchSource: null,\n+   rawLateMinutes: null,\n+   scheduleSource: 'none',\n+   shiftEnd: '',\n+   shiftId: null,\n+   shiftName: 'بلا وردية',\n+   shiftStart: '',\n+   shortfallMinutes: null,\n+   status: 'absent',\n+   unexcusedLateMinutes: null,\n+   unscheduled: true,\n+   workMinutes: 0\n+ }\n- undefined\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ {\n+   attendanceExempt: false,\n+   attendanceReviewReason: null,\n+   attendanceReviewRequired: false,\n+   attendanceRuleSnapshot: null,\n+   branchId: 1,\n+   checkIn: null,\n+   checkOut: null,\n+   computedAt: '2026-09-26T03:42:48.003Z',\n+   countedWorkMinutes: null,\n+   date: '2026-09-15',\n+   deductibleMinutes: 0,\n+   earlyArrivalMinutes: null,\n+   earlyLeaveMinutes: 0,\n+   employeeId: 2,\n+   excusedMinutes: 0,\n+   exemption: null,\n+   flexOutcome: null,\n+   graceUsed: null,\n+   hasShortfall: false,\n+   id: 1,\n+   lateMinutes: 0,\n+   leaveConflict: false,\n+   manualReason: null,\n+   punchAnomalies: null,\n+   punchSource: null,\n+   rawLateMinutes: null,\n+   scheduleSource: 'none',\n+   shiftEnd: '',\n+   shiftId: null,\n+   shiftName: 'بلا وردية',\n+   shiftStart: '',\n+   shortfallMinutes: null,\n+   status: 'absent',\n+   unexcusedLateMinutes: null,\n+   unscheduled: true,\n+   workMinutes: 0\n+ }\n- undefined\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:68:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 3798.3002,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ {\n+   attendanceExempt: false,\n+   attendanceReviewReason: null,\n+   attendanceReviewRequired: false,\n+   attendanceRuleSnapshot: null,\n+   branchId: 1,\n+   checkIn: null,\n+   checkOut: null,\n+   computedAt: '2026-09-26T03:42:48.003Z',\n+   countedWorkMinutes: null,\n+   date: '2026-09-15',\n+   deductibleMinutes: 0,\n+   earlyArrivalMinutes: null,\n+   earlyLeaveMinutes: 0,\n+   employeeId: 2,\n+   excusedMinutes: 0,\n+   exemption: null,\n+   flexOutcome: null,\n+   graceUsed: null,\n+   hasShortfall: false,\n+   id: 1,\n+   lateMinutes: 0,\n+   leaveConflict: false,\n+   manualReason: null,\n+   punchAnomalies: null,\n+   punchSource: null,\n+   rawLateMinutes: null,\n+   scheduleSource: 'none',\n+   shiftEnd: '',\n+   shiftId: null,\n+   shiftName: 'بلا وردية',\n+   shiftStart: '',\n+   shortfallMinutes: null,\n+   status: 'absent',\n+   unexcusedLateMinutes: null,\n+   unscheduled: true,\n+   workMinutes: 0\n+ }\n- undefined\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ {\n+   attendanceExempt: false,\n+   attendanceReviewReason: null,\n+   attendanceReviewRequired: false,\n+   attendanceRuleSnapshot: null,\n+   branchId: 1,\n+   checkIn: null,\n+   checkOut: null,\n+   computedAt: '2026-09-26T03:42:48.003Z',\n+   countedWorkMinutes: null,\n+   date: '2026-09-15',\n+   deductibleMinutes: 0,\n+   earlyArrivalMinutes: null,\n+   earlyLeaveMinutes: 0,\n+   employeeId: 2,\n+   excusedMinutes: 0,\n+   exemption: null,\n+   flexOutcome: null,\n+   graceUsed: null,\n+   hasShortfall: false,\n+   id: 1,\n+   lateMinutes: 0,\n+   leaveConflict: false,\n+   manualReason: null,\n+   punchAnomalies: null,\n+   punchSource: null,\n+   rawLateMinutes: null,\n+   scheduleSource: 'none',\n+   shiftEnd: '',\n+   shiftId: null,\n+   shiftName: 'بلا وردية',\n+   shiftStart: '',\n+   shortfallMinutes: null,\n+   status: 'absent',\n+   unexcusedLateMinutes: null,\n+   unscheduled: true,\n+   workMinutes: 0\n+ }\n- undefined\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ {\n+   attendanceExempt: false,\n+   attendanceReviewReason: null,\n+   attendanceReviewRequired: false,\n+   attendanceRuleSnapshot: null,\n+   branchId: 1,\n+   checkIn: null,\n+   checkOut: null,\n+   computedAt: '2026-09-26T03:42:48.003Z',\n+   countedWorkMinutes: null,\n+   date: '2026-09-15',\n+   deductibleMinutes: 0,\n+   earlyArrivalMinutes: null,\n+   earlyLeaveMinutes: 0,\n+   employeeId: 2,\n+   excusedMinutes: 0,\n+   exemption: null,\n+   flexOutcome: null,\n+   graceUsed: null,\n+   hasShortfall: false,\n+   id: 1,\n+   lateMinutes: 0,\n+   leaveConflict: false,\n+   manualReason: null,\n+   punchAnomalies: null,\n+   punchSource: null,\n+   rawLateMinutes: null,\n+   scheduleSource: 'none',\n+   shiftEnd: '',\n+   shiftId: null,\n+   shiftName: 'بلا وردية',\n+   shiftStart: '',\n+   shortfallMinutes: null,\n+   status: 'absent',\n+   unexcusedLateMinutes: null,\n+   unscheduled: true,\n+   workMinutes: 0\n+ }\n- undefined\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:68:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"card-after-transfer\",\"baseline\":true,\"directEmployeeStatus\":404,\"historicalRequestStatus\":200,\"card\":null,\"confidentialMasked\":true}",
    "{\"probe\":\"archive-fallback-report\",\"dailyAbsent\":true,\"reportAbsentDays\":1,\"expected\":0}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13979.5532"
  ],
  "stdout": [
    "CR4_BASELINE {\"commit\":\"6b20663\",\"productFilesInMemory\":72,\"legacyTokenFixture\":true,\"productFilesWritten\":0}\n",
    "CR4_BASELINE_VERIFIED legacy numeric branch scope\n",
    "{\"cleanupVerified\":\"hr_codex_r4edges_test_c6f2754c73060643\"}\n",
    "CR4_BASELINE {\"commit\":\"6b20663\",\"productFilesInMemory\":72,\"legacyTokenFixture\":true,\"productFilesWritten\":0}\n",
    "CR4_BASELINE_VERIFIED legacy numeric branch scope\n",
    "{\"cleanupVerified\":\"hr_codex_r4independent_test_bfbb78f9b17263d7\"}\n"
  ]
}
