module.exports = {
  "selected": [
    "codex-review-round34-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 9765.8132
  },
  "results": [
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 bonus: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 5822.6129,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 deduction: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 1575.9994,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"request-payroll-reference-lifecycle\",\"kind\":\"bonus\",\"foreignHidden\":true,\"companyVisible\":true,\"selfVisible\":true,\"reservedRefusal\":409,\"closedPeriod\":400,\"deferredEventRedacted\":true,\"storedEventsUnchanged\":true,\"amount\":123.45,\"net\":9123.45,\"reconciliation\":null}",
    "{\"case\":\"request-payroll-reference-lifecycle\",\"kind\":\"deduction\",\"foreignHidden\":true,\"companyVisible\":true,\"selfVisible\":true,\"reservedRefusal\":409,\"closedPeriod\":400,\"deferredEventRedacted\":true,\"storedEventsUnchanged\":true,\"amount\":67.89,\"net\":8932.11,\"reconciliation\":\"snapshot branch B only; difference 0\"}",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9765.8132"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_independent_test_24fc4506c8bbd7e9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_independent_test_24fc4506c8bbd7e9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_independent_test_24fc4506c8bbd7e9\"}\n"
  ]
}
