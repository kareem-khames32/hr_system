module.exports = {
  "selected": [
    "codex-review-round4-independent",
    "codex-review-round4-edges",
    "codex-review-round4-migrations"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 15,
      "failed": 1,
      "passed": 14,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 15,
      "suites": 0
    },
    "duration_ms": 21095.7347
  },
  "results": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 3508.9093,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 27.3303,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 19.4753,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 payroll separation licence cannot evade its specific permission by SQL case folding",
      "ms": 24.3004,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 67.4043,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 HR permission grants one financial effect for another employee, never own request or outside scope",
      "ms": 174.9217,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 exemption subject cannot approve or reject an exemption created by someone else",
      "ms": 43.9071,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 financial and calendar Saturday occurrences are checked against enumerated dates, then versioned",
      "ms": 4304.2772,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 service window ignores cancelled and pre-rehire offboarding, honors actual start and archive fallback",
      "ms": 372.5229,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 foreign work schedule and shift history must respect branch scope",
      "ms": 66.7236,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 request card masks confidential records and must not reveal the new foreign organization after transfer",
      "ms": 75.6307,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 968.884,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n403 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n403 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n403 !== 200\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:99:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 live calendar priority keeps official holiday above schedule, branch and company rules",
      "ms": 424.5306,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 category rollback and concurrent changes keep every follower on the final mapping",
      "ms": 145.439,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-migrations.integration.cjs",
      "name": "CR4 migrations 068 and 069 are additive, idempotent and match all entity metadata",
      "ms": 4825.2886,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 968.884,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n403 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n403 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n403 !== 200\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:99:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"category-case-folding\",\"canonicalStatus\":400,\"directStatus\":403,\"uppercaseStatus\":400,\"storedCategoryChain\":1,\"typeChain\":1,\"expectedChain\":1}",
    "{\"probe\":\"request-existence\",\"foreign\":404,\"missing\":404,\"foreignBody\":{\"message\":\"الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404},\"missingBody\":{\"message\":\"الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"exemption-existence\",\"foreign\":404,\"missing\":404,\"foreignBody\":{\"message\":\"الموظف غير موجود\",\"error\":\"Not Found\",\"statusCode\":404},\"missingBody\":{\"message\":\"الموظف غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"payroll-licence-case-folding\",\"normalStatus\":403,\"uppercaseStatus\":403,\"storedValue\":\"false\",\"actorHasLicence\":false}",
    "{\"probe\":\"archive-fallback-report\",\"dailyAbsent\":false,\"reportAbsentDays\":0,\"expected\":0}",
    "{\"probe\":\"HR-financial-once\",\"manualAmount\":123.45,\"actualAmount\":123.45,\"obligations\":1,\"retryStatuses\":[400,400],\"ownStatus\":\"UNDER_REVIEW\",\"clerkStatus\":\"UNDER_REVIEW\",\"outsideStatus\":403}",
    "{\"probe\":\"exemption-subject-SOD\",\"approve\":403,\"reject\":403,\"state\":\"PENDING\"}",
    "{\"calendarCases\":[{\"basis\":\"PAYROLL\",\"occurrence\":\"1ST\",\"expected\":[\"2026-08-29\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"2ND\",\"expected\":[\"2026-09-05\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"3RD\",\"expected\":[\"2026-09-12\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"4TH\",\"expected\":[\"2026-09-19\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"LAST\",\"expected\":[\"2026-09-19\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"ALL\",\"expected\":[\"2026-08-29\",\"2026-09-05\",\"2026-09-12\",\"2026-09-19\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"1ST\",\"expected\":[\"2026-09-05\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"2ND\",\"expected\":[\"2026-09-12\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"3RD\",\"expected\":[\"2026-09-19\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"4TH\",\"expected\":[\"2026-09-26\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"LAST\",\"expected\":[\"2026-09-26\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"ALL\",\"expected\":[\"2026-09-05\",\"2026-09-12\",\"2026-09-19\",\"2026-09-26\"]}],\"midMonthVersion\":true,\"pinnedCycleRetained\":true}",
    "{\"serviceWindow\":{\"employeeId\":14,\"workScheduleId\":null,\"status\":\"archived\",\"from\":\"2026-09-04\",\"to\":\"2026-09-18\",\"toSource\":\"ARCHIVE\"},\"applied\":2,\"outside\":2}",
    "{\"probe\":\"foreign-rule-history\",\"probes\":[{\"kind\":\"WORK_SCHEDULE\",\"status\":404,\"rows\":null,\"exposesReason\":false},{\"kind\":\"SHIFT\",\"status\":404,\"rows\":null,\"exposesReason\":false}]}",
    "{\"probe\":\"card-after-transfer\",\"baseline\":false,\"directEmployeeStatus\":404,\"historicalRequestStatus\":200,\"card\":{\"employeeId\":15,\"fullName\":\"Review employee 29\",\"employeeCode\":\"R4EDGE29\",\"jobTitle\":null,\"departmentName\":null,\"branchName\":null,\"teamName\":null,\"directManagerName\":null,\"orgHidden\":true},\"confidentialMasked\":true}",
    "{\"calendarPriority\":true,\"beforeHoliday\":[true,false,true],\"duringHoliday\":[false,false,false],\"shiftDoesNotCreateAbsenceOnRest\":true,\"workScheduleAbsence\":true}",
    "{\"atomicRollback\":true,\"injectedFailure\":500,\"concurrentStatuses\":[200,200,201],\"finalMapping\":3,\"followers\":2,\"customTypeRetained\":true}",
    "{\"migrationFiles\":[\"20260926_068_user_branch_scopes.sql\",\"20260926_069_work_schedule_weekend_exceptions.sql\"],\"runsEach\":2,\"entitySchemaDelta\":0,\"rowCountsUnchanged\":true,\"backfill\":false,\"engine\":{\"version\":\"16.0.4255.1\",\"edition\":\"Express Edition (64-bit)\",\"compatibility\":150}}",
    "tests 15",
    "suites 0",
    "pass 14",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 21095.7347"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_r4independent_test_07b7479089705c23\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r4edges_test_a3d857151c94689d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r4migrations_test_dd4f4263058d0239\"}\n"
  ]
}
