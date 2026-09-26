module.exports = {
  "selected": [
    "codex-review-round4-edges"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 2,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 8496.9684
  },
  "results": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 foreign work schedule and shift history must respect branch scope",
      "ms": 4222.2003,
      "pass": false,
      "error": "Foreign branch rule history was returned",
      "cause": "Foreign branch rule history was returned",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign branch rule history was returned\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:65:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 280.2949,
      "pass": false,
      "error": "POST /payroll/runs: 403 {\"message\":\"سياسة الرواتب خارج نطاق الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "cause": "POST /payroll/runs: 403 {\"message\":\"سياسة الرواتب خارج نطاق الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 403 {\"message\":\"سياسة الرواتب خارج نطاق الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round4-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:92:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 foreign work schedule and shift history must respect branch scope",
      "ms": 4222.2003,
      "pass": false,
      "error": "Foreign branch rule history was returned",
      "cause": "Foreign branch rule history was returned",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign branch rule history was returned\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:65:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 280.2949,
      "pass": false,
      "error": "POST /payroll/runs: 403 {\"message\":\"سياسة الرواتب خارج نطاق الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "cause": "POST /payroll/runs: 403 {\"message\":\"سياسة الرواتب خارج نطاق الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 403 {\"message\":\"سياسة الرواتب خارج نطاق الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round4-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:92:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"foreign-rule-history\",\"probes\":[{\"kind\":\"WORK_SCHEDULE\",\"status\":200,\"rows\":1,\"exposesReason\":true},{\"kind\":\"SHIFT\",\"status\":200,\"rows\":1,\"exposesReason\":true}]}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8496.9684"
  ],
  "stdout": [
    "CR4_BASELINE {\"commit\":\"6b20663\",\"productFilesInMemory\":72,\"legacyTokenFixture\":true,\"productFilesWritten\":0}\n",
    "CR4_BASELINE_VERIFIED legacy numeric branch scope\n",
    "{\"cleanupVerified\":\"hr_codex_r4edges_test_2a374425dff6f01c\"}\n"
  ]
}
