module.exports = {
  "selected": [
    "codex-review-p5d-calendar-pool"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 3,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 30080.2452
  },
  "results": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L01: transaction calendar matches ordinary calendar across holiday/weekend/year boundary",
      "ms": 8246.1874,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L02: leave calendar and year-split calls complete with a full pool",
      "ms": 711.5156,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 6141.3272,
      "pass": false,
      "error": "calendar barrier\n\n0 !== 1\n",
      "cause": "calendar barrier\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: calendar barrier\n\n0 !== 1\n\n    at calendarPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:130:299)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:150:47)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 6210.6695,
      "pass": false,
      "error": "barrier maxBackdateDays\n\n0 !== 1\n",
      "cause": "barrier maxBackdateDays\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier maxBackdateDays\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:299)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:156:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 6144.1588,
      "pass": false,
      "error": "barrier assertSufficient\n\n0 !== 1\n",
      "cause": "barrier assertSufficient\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier assertSufficient\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:299)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:164:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L03: holiday calendar lookup completes with a full pool and rejects an ordinary workday",
      "ms": 6141.3272,
      "pass": false,
      "error": "calendar barrier\n\n0 !== 1\n",
      "cause": "calendar barrier\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: calendar barrier\n\n0 !== 1\n\n    at calendarPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:130:299)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:150:47)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L04: default backdate-policy read still takes a pool connection inside leave submit",
      "ms": 6210.6695,
      "pass": false,
      "error": "barrier maxBackdateDays\n\n0 !== 1\n",
      "cause": "barrier maxBackdateDays\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier maxBackdateDays\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:299)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:156:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5d-calendar-pool.integration.cjs",
      "name": "P5D-L05: balance sufficiency reads still take a pool connection inside leave submit",
      "ms": 6144.1588,
      "pass": false,
      "error": "barrier assertSufficient\n\n0 !== 1\n",
      "cause": "barrier assertSufficient\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: barrier assertSufficient\n\n0 !== 1\n\n    at fullPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:125:299)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-calendar-pool.integration.cjs:164:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5D-L01\",\"days\":{\"total\":8,\"working\":5,\"skipped\":[\"2026-12-30\",\"2027-01-01\",\"2027-01-02\"]},\"matched\":true}",
    "{\"id\":\"P5D-L02\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"days\":5}",
    "Cleanup verified: hr_expense_reports_test_049e568cb4970494 is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 2",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 30080.2452"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_049e568cb4970494\"}\n",
    "{\"REVIEW_MEASURE\":\"calendarDay\",\"early\":{\"status\":400,\"body\":{\"message\":\"يوم 2027-01-01 لسه ماجاش — قدّم على أيام العطلة اللي اشتغلتها فعلًا\",\"error\":\"Bad Request\",\"statusCode\":400}}}\n",
    "{\"REVIEW_MEASURE\":\"maxBackdateDays\",\"early\":{\"status\":201,\"body\":{\"id\":21,\"typeCode\":\"LEAVE\",\"definitionCode\":\"LEAVE_CASUAL\",\"requesterId\":1,\"createdByUserId\":2,\"branchId\":1,\"status\":\"UNDER_REVIEW\",\"currentStep\":1,\"payload\":\"{\\\"fromDate\\\":\\\"2027-02-01\\\",\\\"toDate\\\":\\\"2027-02-01\\\",\\\"leaveTypeCode\\\":\\\"CASUAL\\\",\\\"leaveType\\\":\\\"CASUAL\\\",\\\"days\\\":1,\\\"skippedHolidays\\\":[]}\",\"destinationRef\":null,\"resolvedSteps\":\"[{\\\"stepOrder\\\":1,\\\"role\\\":\\\"hr\\\",\\\"approverEmployeeId\\\":null,\\\"slaDays\\\":null,\\\"escalateTo\\\":null,\\\"dueAt\\\":null,\\\"actedAt\\\":null,\\\"action\\\":null}]\",\"createdAt\":\"2026-10-08T18:13:36.713Z\",\"submittedAt\":\"2026-10-08T21:13:36.000Z\",\"completedAt\":null,\"executionTaskId\":null}}}\n",
    "{\"REVIEW_MEASURE\":\"assertSufficient\",\"early\":{\"status\":201,\"body\":{\"id\":31,\"typeCode\":\"LEAVE\",\"definitionCode\":\"LEAVE_ANNUAL\",\"requesterId\":1,\"createdByUserId\":2,\"branchId\":1,\"status\":\"UNDER_REVIEW\",\"currentStep\":1,\"payload\":\"{\\\"fromDate\\\":\\\"2027-03-01\\\",\\\"toDate\\\":\\\"2027-03-01\\\",\\\"leaveTypeCode\\\":\\\"ANNUAL\\\",\\\"leaveType\\\":\\\"ANNUAL\\\",\\\"days\\\":1,\\\"skippedHolidays\\\":[]}\",\"destinationRef\":null,\"resolvedSteps\":\"[{\\\"stepOrder\\\":1,\\\"role\\\":\\\"hr\\\",\\\"approverEmployeeId\\\":null,\\\"slaDays\\\":null,\\\"escalateTo\\\":null,\\\"dueAt\\\":null,\\\"actedAt\\\":null,\\\"action\\\":null}]\",\"createdAt\":\"2026-10-08T18:13:42.936Z\",\"submittedAt\":\"2026-10-08T21:13:43.000Z\",\"completedAt\":null,\"executionTaskId\":null}}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_049e568cb4970494\"}\n"
  ]
}
