module.exports = {
  "selected": [
    "codex-review-round5-independent",
    "codex-review-round5-edges",
    "codex-review-round5-migrations"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 15,
      "failed": 0,
      "passed": 15,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 15,
      "suites": 0
    },
    "duration_ms": 24466.8107
  },
  "results": [
    {
      "file": "codex-review-round5-independent.integration.cjs",
      "name": "CR5 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 3766.4426,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-independent.integration.cjs",
      "name": "CR5 outside request and nonexistent request must not reveal existence",
      "ms": 26.969,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-independent.integration.cjs",
      "name": "CR5 outside exemption target and missing target must not reveal existence",
      "ms": 22.4878,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-independent.integration.cjs",
      "name": "CR5 payroll separation licence cannot evade its specific permission by SQL case folding",
      "ms": 25.7726,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-independent.integration.cjs",
      "name": "CR5 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 72.6418,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-independent.integration.cjs",
      "name": "CR5 HR permission grants one financial effect for another employee, never own request or outside scope",
      "ms": 200.805,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-independent.integration.cjs",
      "name": "CR5 exemption subject cannot approve or reject an exemption created by someone else",
      "ms": 52.1651,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-edges.integration.cjs",
      "name": "CR5 financial and calendar Saturday occurrences are checked against enumerated dates, then versioned",
      "ms": 4890.6731,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-edges.integration.cjs",
      "name": "CR5 service window ignores cancelled and pre-rehire offboarding, honors actual start and archive fallback",
      "ms": 449.265,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-edges.integration.cjs",
      "name": "CR5 foreign work schedule and shift history must respect branch scope",
      "ms": 78.3022,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-edges.integration.cjs",
      "name": "CR5 request card masks confidential records and must not reveal the new foreign organization after transfer",
      "ms": 88.0292,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-edges.integration.cjs",
      "name": "CR5 unauthorized upper-case licence is blocked and real self-calculated payroll stays unapproved",
      "ms": 1170.6202,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-edges.integration.cjs",
      "name": "CR5 live calendar priority keeps official holiday above schedule, branch and company rules",
      "ms": 473.385,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-edges.integration.cjs",
      "name": "CR5 category rollback and concurrent changes keep every follower on the final mapping",
      "ms": 144.1095,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-migrations.integration.cjs",
      "name": "CR5 migrations 068 and 069 are additive, idempotent and match all entity metadata",
      "ms": 6275.684,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
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
    "{\"probe\":\"card-after-transfer\",\"baseline\":false,\"directEmployeeStatus\":404,\"historicalRequestStatus\":200,\"card\":{\"employeeId\":15,\"fullName\":\"Review employee 29\",\"employeeCode\":\"R5EDGE29\",\"jobTitle\":null,\"departmentName\":null,\"branchName\":null,\"teamName\":null,\"directManagerName\":null,\"orgHidden\":true},\"confidentialMasked\":true}",
    "{\"probe\":\"actual-self-approval\",\"beforeStatus\":403,\"beforeCode\":\"PAYRUN-STATE-003\",\"uppercasePatch\":403,\"afterStatus\":403,\"savedStatus\":\"CALCULATED\",\"approvedBy\":null,\"calculator\":4,\"actorHasLicence\":false}",
    "{\"calendarPriority\":true,\"beforeHoliday\":[true,false,true],\"duringHoliday\":[false,false,false],\"shiftDoesNotCreateAbsenceOnRest\":true,\"workScheduleAbsence\":true}",
    "{\"atomicRollback\":true,\"injectedFailure\":500,\"concurrentStatuses\":[200,200,201],\"finalMapping\":3,\"followers\":2,\"customTypeRetained\":true}",
    "{\"migrationFiles\":[\"20260926_068_user_branch_scopes.sql\",\"20260926_069_work_schedule_weekend_exceptions.sql\"],\"runsEach\":2,\"entitySchemaDelta\":0,\"rowCountsUnchanged\":true,\"backfill\":false,\"engine\":{\"version\":\"16.0.4255.1\",\"edition\":\"Express Edition (64-bit)\",\"compatibility\":150}}",
    "tests 15",
    "suites 0",
    "pass 15",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 24466.8107"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5independent_test_b3cfcad026a4a041\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5independent_test_b3cfcad026a4a041\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5independent_test_b3cfcad026a4a041\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5edges_test_00a784412a191867\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5edges_test_00a784412a191867\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5edges_test_00a784412a191867\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5migrations_test_f66256d48a2be8f9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5migrations_test_f66256d48a2be8f9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5migrations_test_f66256d48a2be8f9\"}\n"
  ]
}
