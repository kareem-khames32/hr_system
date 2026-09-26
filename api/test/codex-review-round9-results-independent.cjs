module.exports = {
  "selected": [
    "codex-review-round9-independent",
    "codex-review-round9-search-boundary"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 1,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 193525.5915
  },
  "results": [
    {
      "file": "codex-review-round9-independent.integration.cjs",
      "name": "CR9 permitted public and same-branch references survive while foreign references disappear from the complete response",
      "ms": 9196.9294,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round9-independent.integration.cjs",
      "name": "CR9 unreadable audience has no numeric reference anywhere, including blockers and sourceRefs",
      "ms": 160.7877,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round9-search-boundary.integration.cjs",
      "name": "CR9 exhausting 3000 of 3001 historical candidates reports incomplete search, persists no order, and allows an explicit employee target",
      "ms": 178101.776,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round9-search-boundary.integration.cjs",
      "name": "CR9 current membership in a child department ranks its eligible employee before 3000 nonmembers",
      "ms": 437.2521,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round9-search-boundary.integration.cjs",
      "name": "CR9 historical cross-branch candidate is still checked; a complete 3000-person working-day search has the normal rejection",
      "ms": 73.0946,
      "pass": false,
      "error": "PATCH /employees/3001: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/3001: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/3001: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round9-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round9-search-boundary.integration.cjs:54:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round9-search-boundary.integration.cjs",
      "name": "CR9 historical cross-branch candidate is still checked; a complete 3000-person working-day search has the normal rejection",
      "ms": 73.0946,
      "pass": false,
      "error": "PATCH /employees/3001: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/3001: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/3001: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round9-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round9-search-boundary.integration.cjs:54:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 193525.5915"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r9privacy_test_7439dbe6dc4df4ac\"}\n",
    "CR9_EVIDENCE {\"case\":\"permitted-and-hidden-references\",\"allowedIds\":[1,2],\"foreignReferenceAbsentFromWholeResponse\":true,\"foreignAuthorizedRead\":200}\n",
    "CR9_EVIDENCE {\"case\":\"invalid-audience-reference\",\"genericIssue\":true,\"numericReferenceAbsentFromWholeResponse\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r9privacy_test_7439dbe6dc4df4ac\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r9privacy_test_7439dbe6dc4df4ac\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r9search_test_6ebf0040efe59f46\"}\n",
    "CR9_EVIDENCE {\"case\":\"search-exhaustion\",\"targets\":3001,\"visited\":3000,\"eligibleVisited\":false,\"status\":400,\"message\":\"2026-09-15: فحص «العطلة المخصصة» وقف عند 3000 موظف من 3001 من غير ما يلاقي حد اليوم ده عطلته — حدد الموظفين بالاسم أو قسم/فريق أصغر في الأمر\",\"orderRowsAddedByFailedAttempt\":0,\"explicitEmployeeStatus\":201}\n",
    "CR9_EVIDENCE {\"case\":\"descendant-department-priority\",\"employeeId\":3001,\"status\":201,\"visited\":1,\"first\":3001}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r9search_test_6ebf0040efe59f46\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r9search_test_6ebf0040efe59f46\"}\n"
  ]
}
