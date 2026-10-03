module.exports = {
  "selected": [
    "codex-review-round29-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 8585.0059
  },
  "results": [
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 4151.9492,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 184.092,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 181.6327,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 236.5254,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 344.7893,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 203.0349,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 185.724,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 196.199,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 early loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 385.2666,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 defer loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 264.7139,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"instant-manual-equality\",\"kind\":\"bonus\",\"amount\":123.45,\"eachObligations\":1,\"replay\":409,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"bonus\",\"action\":\"approve\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"bonus\",\"action\":\"reject\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"bonus\",\"action\":\"cancel\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"instant-manual-equality\",\"kind\":\"deduction\",\"amount\":123.45,\"eachObligations\":1,\"replay\":409,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"deduction\",\"action\":\"approve\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"deduction\",\"action\":\"reject\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"deduction\",\"action\":\"cancel\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"loan-request-branch-recheck\",\"kind\":\"early\",\"transfer\":200,\"oldApproval\":403,\"rollbackComplete\":true,\"newBranchApproval\":201,\"replayNoEffect\":true,\"amount\":123.45}",
    "{\"case\":\"loan-request-branch-recheck\",\"kind\":\"defer\",\"transfer\":200,\"oldApproval\":403,\"rollbackComplete\":true,\"newBranchApproval\":201,\"replayNoEffect\":true,\"amount\":900}",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8585.0059"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r29_independent_test_3f9ac28b68d962f0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r29_independent_test_3f9ac28b68d962f0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r29_independent_test_3f9ac28b68d962f0\"}\n"
  ]
}
