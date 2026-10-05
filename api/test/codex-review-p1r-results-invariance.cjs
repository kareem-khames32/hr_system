module.exports = {
  "selected": [
    "codex-review-p1r-invariance"
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
    "duration_ms": 29285.3569
  },
  "results": [
    {
      "file": "codex-review-p1r-invariance.integration.cjs",
      "name": "P1R hidden payroll additions do not change a visible older comparison until the scan boundary",
      "ms": 20111.7557,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p1r-invariance.integration.cjs",
      "name": "P1R a fiftieth foreign header must not remove a visible previous series and leaver",
      "ms": 1053.2442,
      "pass": false,
      "error": "Foreign headers must not displace the visible historical series\n+ actual - expected\n\n  {\n    counts: {\n      changed: 0,\n+     leavers: 0,\n-     leavers: 1,\n      new: 0\n    },\n+   leavers: [],\n-   leavers: [\n-     {\n-       employeeCode: 'R25-2',\n-       employeeId: 2,\n-       fullName: 'موظف اختبار مستقل 2'\n-     }\n-   ],\n    period: '2026-11',\n+   previousSeriesPeriod: null,\n-   previousSeriesPeriod: '2019-01',\n    rows: [],\n    runId: 2,\n    scoped: true\n  }\n",
      "cause": "Foreign headers must not displace the visible historical series\n+ actual - expected\n\n  {\n    counts: {\n      changed: 0,\n+     leavers: 0,\n-     leavers: 1,\n      new: 0\n    },\n+   leavers: [],\n-   leavers: [\n-     {\n-       employeeCode: 'R25-2',\n-       employeeId: 2,\n-       fullName: 'موظف اختبار مستقل 2'\n-     }\n-   ],\n    period: '2026-11',\n+   previousSeriesPeriod: null,\n-   previousSeriesPeriod: '2019-01',\n    rows: [],\n    runId: 2,\n    scoped: true\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign headers must not displace the visible historical series\n+ actual - expected\n\n  {\n    counts: {\n      changed: 0,\n+     leavers: 0,\n-     leavers: 1,\n      new: 0\n    },\n+   leavers: [],\n-   leavers: [\n-     {\n-       employeeCode: 'R25-2',\n-       employeeId: 2,\n-       fullName: 'موظف اختبار مستقل 2'\n-     }\n-   ],\n    period: '2026-11',\n+   previousSeriesPeriod: null,\n-   previousSeriesPeriod: '2019-01',\n    rows: [],\n    runId: 2,\n    scoped: true\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1r-invariance.integration.cjs:26:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p1r-invariance.integration.cjs",
      "name": "P1R a fiftieth foreign header must not remove a visible previous series and leaver",
      "ms": 1053.2442,
      "pass": false,
      "error": "Foreign headers must not displace the visible historical series\n+ actual - expected\n\n  {\n    counts: {\n      changed: 0,\n+     leavers: 0,\n-     leavers: 1,\n      new: 0\n    },\n+   leavers: [],\n-   leavers: [\n-     {\n-       employeeCode: 'R25-2',\n-       employeeId: 2,\n-       fullName: 'موظف اختبار مستقل 2'\n-     }\n-   ],\n    period: '2026-11',\n+   previousSeriesPeriod: null,\n-   previousSeriesPeriod: '2019-01',\n    rows: [],\n    runId: 2,\n    scoped: true\n  }\n",
      "cause": "Foreign headers must not displace the visible historical series\n+ actual - expected\n\n  {\n    counts: {\n      changed: 0,\n+     leavers: 0,\n-     leavers: 1,\n      new: 0\n    },\n+   leavers: [],\n-   leavers: [\n-     {\n-       employeeCode: 'R25-2',\n-       employeeId: 2,\n-       fullName: 'موظف اختبار مستقل 2'\n-     }\n-   ],\n    period: '2026-11',\n+   previousSeriesPeriod: null,\n-   previousSeriesPeriod: '2019-01',\n    rows: [],\n    runId: 2,\n    scoped: true\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign headers must not displace the visible historical series\n+ actual - expected\n\n  {\n    counts: {\n      changed: 0,\n+     leavers: 0,\n-     leavers: 1,\n      new: 0\n    },\n+   leavers: [],\n-   leavers: [\n-     {\n-       employeeCode: 'R25-2',\n-       employeeId: 2,\n-       fullName: 'موظف اختبار مستقل 2'\n-     }\n-   ],\n    period: '2026-11',\n+   previousSeriesPeriod: null,\n-   previousSeriesPeriod: '2019-01',\n    rows: [],\n    runId: 2,\n    scoped: true\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1r-invariance.integration.cjs:26:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"49-hidden-headers\",\"responseIdentical\":true,\"previousPeriod\":\"2019-01\",\"leavers\":1}",
    "{\"case\":\"50-hidden-headers\",\"before\":{\"runId\":2,\"period\":\"2026-11\",\"scoped\":true,\"previousSeriesPeriod\":\"2019-01\",\"rows\":[],\"leavers\":[{\"employeeId\":2,\"employeeCode\":\"R25-2\",\"fullName\":\"موظف اختبار مستقل 2\"}],\"counts\":{\"changed\":0,\"new\":0,\"leavers\":1}},\"after\":{\"runId\":2,\"period\":\"2026-11\",\"scoped\":true,\"previousSeriesPeriod\":null,\"rows\":[],\"leavers\":[],\"counts\":{\"changed\":0,\"new\":0,\"leavers\":0}},\"foreignUnreadable\":true,\"fixture\":\"seeded valid historical run and membership rows; no payroll calculation in this case\"}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 29285.3569"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1r_invariance_test_90c6335d8b334a02\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1r_invariance_test_90c6335d8b334a02\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1r_invariance_test_90c6335d8b334a02\"}\n"
  ]
}
