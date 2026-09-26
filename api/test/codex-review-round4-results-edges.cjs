module.exports = {
  "selected": [
    "codex-review-round4-edges"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 4,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 12602.3795
  },
  "results": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 financial and calendar Saturday occurrences are checked against enumerated dates, then versioned",
      "ms": 6365.066,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 service window ignores cancelled and pre-rehire offboarding, honors actual start and archive fallback",
      "ms": 596.7602,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- true\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:49:55)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 foreign work schedule and shift history must respect branch scope",
      "ms": 88.4167,
      "pass": false,
      "error": "Foreign branch rule history was returned",
      "cause": "Foreign branch rule history was returned",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign branch rule history was returned\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:62:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 request card masks confidential records and must not reveal the new foreign organization after transfer",
      "ms": 120.1099,
      "pass": false,
      "error": "Historical request exposed current out-of-scope employee data",
      "cause": "Historical request exposed current out-of-scope employee data",
      "stack": "AssertionError [ERR_ASSERTION]: Historical request exposed current out-of-scope employee data\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:78:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 2827.8893,
      "pass": false,
      "error": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "cause": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual run approved by its own calculator without licence permission\n\n201 !== 403\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:102:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 service window ignores cancelled and pre-rehire offboarding, honors actual start and archive fallback",
      "ms": 596.7602,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- true\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:49:55)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 foreign work schedule and shift history must respect branch scope",
      "ms": 88.4167,
      "pass": false,
      "error": "Foreign branch rule history was returned",
      "cause": "Foreign branch rule history was returned",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign branch rule history was returned\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:62:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 request card masks confidential records and must not reveal the new foreign organization after transfer",
      "ms": 120.1099,
      "pass": false,
      "error": "Historical request exposed current out-of-scope employee data",
      "cause": "Historical request exposed current out-of-scope employee data",
      "stack": "AssertionError [ERR_ASSERTION]: Historical request exposed current out-of-scope employee data\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:78:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 2827.8893,
      "pass": false,
      "error": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "cause": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual run approved by its own calculator without licence permission\n\n201 !== 403\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:102:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"calendarCases\":[{\"basis\":\"PAYROLL\",\"occurrence\":\"1ST\",\"expected\":[\"2026-08-29\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"2ND\",\"expected\":[\"2026-09-05\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"3RD\",\"expected\":[\"2026-09-12\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"4TH\",\"expected\":[\"2026-09-19\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"LAST\",\"expected\":[\"2026-09-19\"]},{\"basis\":\"PAYROLL\",\"occurrence\":\"ALL\",\"expected\":[\"2026-08-29\",\"2026-09-05\",\"2026-09-12\",\"2026-09-19\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"1ST\",\"expected\":[\"2026-09-05\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"2ND\",\"expected\":[\"2026-09-12\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"3RD\",\"expected\":[\"2026-09-19\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"4TH\",\"expected\":[\"2026-09-26\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"LAST\",\"expected\":[\"2026-09-26\"]},{\"basis\":\"CALENDAR\",\"occurrence\":\"ALL\",\"expected\":[\"2026-09-05\",\"2026-09-12\",\"2026-09-19\",\"2026-09-26\"]}],\"midMonthVersion\":true,\"pinnedCycleRetained\":true}",
    "{\"probe\":\"foreign-rule-history\",\"probes\":[{\"kind\":\"WORK_SCHEDULE\",\"status\":200,\"rows\":1,\"exposesReason\":true},{\"kind\":\"SHIFT\",\"status\":200,\"rows\":1,\"exposesReason\":true}]}",
    "{\"probe\":\"card-after-transfer\",\"directEmployeeStatus\":404,\"historicalRequestStatus\":200,\"card\":{\"employeeId\":15,\"fullName\":\"Review employee 29\",\"employeeCode\":\"R4EDGE29\",\"jobTitle\":\"Foreign current job\",\"departmentName\":null,\"branchName\":\"Review C\",\"teamName\":null,\"directManagerName\":null},\"confidentialMasked\":true}",
    "{\"probe\":\"actual-self-approval\",\"beforeStatus\":403,\"beforeCode\":\"PAYRUN-STATE-003\",\"uppercasePatch\":200,\"afterStatus\":201,\"savedStatus\":\"APPROVED\",\"approvedBy\":4,\"calculator\":4,\"actorHasLicence\":false}",
    "tests 5",
    "suites 0",
    "pass 1",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12602.3795"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_r4edges_test_714ff5dac823b840\"}\n"
  ]
}
