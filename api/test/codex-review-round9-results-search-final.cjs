module.exports = {
  "selected": [
    "codex-review-round9-search-boundary"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 13446414.296
  },
  "results": [
    {
      "file": "codex-review-round9-search-boundary.integration.cjs",
      "name": "CR9 exhausting 3000 of 3001 historical candidates reports incomplete search, persists no order, and allows an explicit employee target",
      "ms": 177561.1201,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round9-search-boundary.integration.cjs",
      "name": "CR9 current membership in a child department ranks its eligible employee before 3000 nonmembers",
      "ms": 414.7292,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round9-search-boundary.integration.cjs",
      "name": "CR9 historical cross-branch candidate is still checked; a complete 3000-person working-day search has the normal rejection",
      "ms": 13266035.0453,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13446414.296"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r9search_test_340ffa3750231978\"}\n",
    "CR9_EVIDENCE {\"case\":\"search-exhaustion\",\"targets\":3001,\"visited\":3000,\"eligibleVisited\":false,\"status\":400,\"message\":\"2026-09-15: فحص «العطلة المخصصة» وقف عند 3000 موظف من 3001 من غير ما يلاقي حد اليوم ده عطلته — حدد الموظفين بالاسم أو قسم/فريق أصغر في الأمر\",\"orderRowsAddedByFailedAttempt\":0,\"explicitEmployeeStatus\":201}\n",
    "CR9_EVIDENCE {\"case\":\"descendant-department-priority\",\"employeeId\":3001,\"status\":201,\"visited\":1,\"first\":3001}\n",
    "CR9_EVIDENCE {\"case\":\"cross-branch-history-and-complete-search\",\"historicalDay\":\"HOLIDAY\",\"movedEmployeeStatus\":201,\"completeTargets\":3000,\"visited\":3000,\"status\":400,\"message\":\"2026-09-15 يوم عمل عادي — أمر الدوام لأيام العطلة (الويك إند أو العطلات الرسمية) بس\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r9search_test_340ffa3750231978\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r9search_test_340ffa3750231978\"}\n"
  ]
}
