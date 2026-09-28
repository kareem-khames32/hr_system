module.exports = {
  "selected": [
    "codex-review-round17-overtime"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 10986.8007
  },
  "results": [
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 branch: transferred employee automatic overtime does not expose the former branch period name to new branch reader",
      "ms": 8332.6081,
      "pass": false,
      "error": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "cause": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-overtime.integration.cjs:837:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 branch: transferred employee automatic overtime does not expose the former branch period name to new branch reader",
      "ms": 8332.6081,
      "pass": false,
      "error": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "cause": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-overtime.integration.cjs:837:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"transferred-auto-period-scope\",\"transfer\":200,\"detail\":200,\"periodHiddenInList\":true,\"comment\":\"اعتماد تلقائي — فترة إضافي مفتوحة عليها «اعتماد تلقائي» في فرع يوم العمل\",\"storedEvidenceReason\":\"R17-A-PRIVATE-PERIOD\",\"leaked\":true}",
    "Cleanup verified: hr_ot_auto_approve_test_f0ea5cfe6ea595c9 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10986.8007"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_f0ea5cfe6ea595c9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_f0ea5cfe6ea595c9\"}\n"
  ]
}
