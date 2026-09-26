module.exports = {
  "selected": [
    "codex-review-round8-boundaries",
    "codex-review-round8-holiday-limit"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 64247.8436
  },
  "results": [
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 foreign holiday values are hidden; permitted employee and holiday remain readable",
      "ms": 42140.5484,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 hidden foreign holiday must not survive in sourceRefs or expose its covered date",
      "ms": 329.3634,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 corrupt audience produces a generic issue without the holiday name or branch description",
      "ms": 131.1014,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 stored run, policy snapshot, events, payslip and reports do not publish foreign holiday values",
      "ms": 1415.7583,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 dated holiday survives a future calendar edit while a non-target employee stays a working day",
      "ms": 1082.1366,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-holiday-limit.integration.cjs",
      "name": "CR8 branch order is valid when its only holiday recipient is candidate 501",
      "ms": 13898.0375,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 64247.8436"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r8boundaries_test_eaf00667137436df\"}\n",
    "CR8_EVIDENCE {\"case\":\"holiday-value-isolation\",\"allowed\":200,\"hidden\":200,\"foreignEmployee\":403,\"otherRoutes\":[\"/catalogs/holidays\",\"/attendance/calendar-context?scope=GLOBAL&sourceId=0\",\"/calendar?month=2026-10\"]}\n",
    "CR8_EVIDENCE {\"case\":\"foreign-holiday-reference-date-oracle\",\"ref\":\"public_holidays:1\",\"observations\":[{\"day\":\"2026-10-14\",\"foreignReferenceReturned\":false,\"holidayRows\":0},{\"day\":\"2026-10-15\",\"foreignReferenceReturned\":false,\"holidayRows\":0},{\"day\":\"2026-10-16\",\"foreignReferenceReturned\":false,\"holidayRows\":0}]}\n",
    "CR8_EVIDENCE {\"case\":\"corrupt-audience\",\"nameHidden\":true,\"issue\":{\"code\":\"SCHEDULE_HOLIDAY_INVALID\",\"message\":\"سجل عطلة رسمية بتخصيص غير مقروء؛ حجبت تفاصيله\",\"sourceRef\":\"public_holidays\"}}\n",
    "CR8_EVIDENCE {\"case\":\"persisted-and-publishing-surfaces\",\"runId\":1,\"net\":6000,\"shadowCount\":1,\"routes\":[\"/payroll/runs/1\",\"/payroll/runs/1/policy-snapshot\",\"/payroll/runs/1/events\",\"/payroll/runs/1/bank-sheet\",\"/payroll/runs/1/pay-methods\",\"/payroll/items/1\",\"/payroll/runs\",\"/payroll/my-payslips\",\"/reports/payroll?includeDraft=true\",\"/reports/financial/payroll-register?period=2026-10&includeDraft=true\"],\"saved\":[{\"table\":\"PayrollRun\",\"rows\":1},{\"table\":\"PayrollItem\",\"rows\":1},{\"table\":\"PayrollRunMember\",\"rows\":1},{\"table\":\"PayrollRunEvent\",\"rows\":2}]}\n",
    "CR8_EVIDENCE {\"case\":\"dated-calendar-edited-later\",\"currentDate\":\"2026-10-20\",\"historicalDate\":\"2026-09-15\",\"accepted\":201,\"nonTarget\":400}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r8boundaries_test_eaf00667137436df\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r8boundaries_test_eaf00667137436df\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r8limit_test_9109b2ef0b3408d7\"}\n",
    "CR8_EVIDENCE {\"case\":\"501-target-limit\",\"targets\":501,\"eligibleEmployee\":501,\"eligibleDay\":\"HOLIDAY\",\"visited\":1,\"eligibleVisited\":true,\"branchStatus\":201,\"branchBody\":{\"today\":\"2026-09-26\",\"canSeeAmounts\":true,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR8 valid branch holiday order\",\"targetLevel\":\"branch\",\"branchId\":1,\"targetIds\":[],\"targetText\":\"CR8 501 targets كله\",\"dates\":[\"2026-10-15\"],\"multiplier\":1.5,\"status\":\"ACTIVE\",\"note\":null,\"sourceRequestId\":null,\"createdAt\":\"2026-09-26T17:31:39.905Z\",\"createdByName\":\"Review Admin\",\"updatedAt\":null,\"cancelledAt\":null,\"cancelReason\":null,\"cancelledByName\":null,\"canEdit\":true,\"canCancel\":true,\"summary\":{\"targetedEmployees\":501,\"cameEmployees\":0,\"countedDays\":0,\"totalHours\":0,\"totalAmount\":0,\"pastDates\":0},\"rows\":[]},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"individualStatus\":201}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r8limit_test_9109b2ef0b3408d7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r8limit_test_9109b2ef0b3408d7\"}\n"
  ]
}
