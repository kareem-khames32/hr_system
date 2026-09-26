module.exports = {
  "selected": [
    "codex-review-round7-holiday-edges"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 6823.4237
  },
  "results": [
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4472.503,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 193.6945,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6823.4237"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7holiday_test_5322cf05c02b980a\"}\n",
    "CR7_EVIDENCE {\"case\":\"dated-department-holiday-work\",\"calendar\":\"HOLIDAY\",\"status\":201,\"body\":{\"today\":\"2026-09-26\",\"canSeeAmounts\":true,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR7 work on historical holiday\",\"targetLevel\":\"employees\",\"branchId\":1,\"targetIds\":[1],\"targetText\":\"CR7 A — R7MOVE\",\"dates\":[\"2026-09-15\"],\"multiplier\":1.5,\"status\":\"ACTIVE\",\"note\":null,\"sourceRequestId\":null,\"createdAt\":\"2026-09-26T17:13:18.935Z\",\"createdByName\":\"Review Admin\",\"updatedAt\":null,\"cancelledAt\":null,\"cancelReason\":null,\"cancelledByName\":null,\"canEdit\":true,\"canCancel\":true,\"summary\":{\"targetedEmployees\":1,\"cameEmployees\":0,\"countedDays\":0,\"totalHours\":0,\"totalAmount\":0,\"pastDates\":1},\"rows\":[]},\"overtime\":{\"recomputed\":0,\"failed\":0}}}\n",
    "CR7_EVIDENCE {\"case\":\"branch-live-source-isolation\",\"sourceStatus\":200,\"leaked\":false,\"matches\":[]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7holiday_test_5322cf05c02b980a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7holiday_test_5322cf05c02b980a\"}\n"
  ]
}
