module.exports = {
  "selected": [
    "codex-review-round8-boundaries",
    "codex-review-round8-holiday-limit"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 2,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 18794.282
  },
  "results": [
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 foreign holiday values are hidden; permitted employee and holiday remain readable",
      "ms": 3789.8036,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 hidden foreign holiday must not survive in sourceRefs or expose its covered date",
      "ms": 115.3616,
      "pass": false,
      "error": "A holiday removed for branch scope must also be removed from sourceRefs",
      "cause": "A holiday removed for branch scope must also be removed from sourceRefs",
      "stack": "AssertionError [ERR_ASSERTION]: A holiday removed for branch scope must also be removed from sourceRefs\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round8-boundaries.integration.cjs:54:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 corrupt audience produces a generic issue without the holiday name or branch description",
      "ms": 40.7565,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 stored run, policy snapshot, events, payslip and reports do not publish foreign holiday values",
      "ms": 658.377,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 dated holiday survives a future calendar edit while a non-target employee stays a working day",
      "ms": 385.5526,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-holiday-limit.integration.cjs",
      "name": "CR8 branch order is valid when its only holiday recipient is candidate 501",
      "ms": 9624.7458,
      "pass": false,
      "error": "The branch contains an eligible employee; a bounded search cannot establish that every target is working\n\n400 !== 201\n",
      "cause": "The branch contains an eligible employee; a bounded search cannot establish that every target is working\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: The branch contains an eligible employee; a bounded search cannot establish that every target is working\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round8-holiday-limit.integration.cjs:35:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 hidden foreign holiday must not survive in sourceRefs or expose its covered date",
      "ms": 115.3616,
      "pass": false,
      "error": "A holiday removed for branch scope must also be removed from sourceRefs",
      "cause": "A holiday removed for branch scope must also be removed from sourceRefs",
      "stack": "AssertionError [ERR_ASSERTION]: A holiday removed for branch scope must also be removed from sourceRefs\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round8-boundaries.integration.cjs:54:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round8-holiday-limit.integration.cjs",
      "name": "CR8 branch order is valid when its only holiday recipient is candidate 501",
      "ms": 9624.7458,
      "pass": false,
      "error": "The branch contains an eligible employee; a bounded search cannot establish that every target is working\n\n400 !== 201\n",
      "cause": "The branch contains an eligible employee; a bounded search cannot establish that every target is working\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: The branch contains an eligible employee; a bounded search cannot establish that every target is working\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round8-holiday-limit.integration.cjs:35:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 6",
    "suites 0",
    "pass 4",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18794.282"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r8boundaries_test_3d4f87000c69f80e\"}\n",
    "CR8_EVIDENCE {\"case\":\"holiday-value-isolation\",\"allowed\":200,\"hidden\":200,\"foreignEmployee\":403,\"otherRoutes\":[\"/catalogs/holidays\",\"/attendance/calendar-context?scope=GLOBAL&sourceId=0\",\"/calendar?month=2026-10\"]}\n",
    "CR8_EVIDENCE {\"case\":\"foreign-holiday-reference-date-oracle\",\"ref\":\"public_holidays:1\",\"observations\":[{\"day\":\"2026-10-14\",\"foreignReferenceReturned\":false,\"holidayRows\":0},{\"day\":\"2026-10-15\",\"foreignReferenceReturned\":true,\"holidayRows\":0},{\"day\":\"2026-10-16\",\"foreignReferenceReturned\":false,\"holidayRows\":0}]}\n",
    "CR8_EVIDENCE {\"case\":\"corrupt-audience\",\"nameHidden\":true,\"issue\":{\"code\":\"SCHEDULE_HOLIDAY_INVALID\",\"message\":\"سجل عطلة رسمية بتخصيص غير مقروء؛ حجبت تفاصيله\",\"sourceRef\":\"public_holidays\"}}\n",
    "CR8_EVIDENCE {\"case\":\"persisted-and-publishing-surfaces\",\"runId\":1,\"net\":6000,\"shadowCount\":1,\"routes\":[\"/payroll/runs/1\",\"/payroll/runs/1/policy-snapshot\",\"/payroll/runs/1/events\",\"/payroll/runs/1/bank-sheet\",\"/payroll/runs/1/pay-methods\",\"/payroll/items/1\",\"/payroll/runs\",\"/payroll/my-payslips\",\"/reports/payroll?includeDraft=true\",\"/reports/financial/payroll-register?period=2026-10&includeDraft=true\"],\"saved\":[{\"table\":\"PayrollRun\",\"rows\":1},{\"table\":\"PayrollItem\",\"rows\":1},{\"table\":\"PayrollRunMember\",\"rows\":1},{\"table\":\"PayrollRunEvent\",\"rows\":2}]}\n",
    "CR8_EVIDENCE {\"case\":\"dated-calendar-edited-later\",\"currentDate\":\"2026-10-20\",\"historicalDate\":\"2026-09-15\",\"accepted\":201,\"nonTarget\":400}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r8boundaries_test_3d4f87000c69f80e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r8boundaries_test_3d4f87000c69f80e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r8limit_test_2176a2da5409ce1e\"}\n",
    "CR8_EVIDENCE {\"case\":\"501-target-limit\",\"targets\":501,\"eligibleEmployee\":501,\"eligibleDay\":\"HOLIDAY\",\"visited\":500,\"eligibleVisited\":false,\"branchStatus\":400,\"branchBody\":{\"message\":\"2026-10-15 يوم عمل عادي — أمر الدوام لأيام العطلة (الويك إند أو العطلات الرسمية) بس\",\"error\":\"Bad Request\",\"statusCode\":400},\"individualStatus\":201}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r8limit_test_2176a2da5409ce1e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r8limit_test_2176a2da5409ce1e\"}\n"
  ]
}
