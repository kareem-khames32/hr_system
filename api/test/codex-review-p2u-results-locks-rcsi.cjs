module.exports = {
  "selected": [
    "codex-review-p2u-lock-consistency",
    "codex-review-p2u-concurrency"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 15865.0381
  },
  "results": [
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U reader cannot return a value written after restriction; writer waits on real application lock",
      "ms": 5410.8665,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U reader before branch transfer gets only pre-transfer value; new branch writer waits",
      "ms": 143.1786,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U saved response remains inside transaction; transfer blocks until response is built",
      "ms": 80.3235,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U concurrent definition update with value save completes without losing either result",
      "ms": 97.2215,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-concurrency.integration.cjs",
      "name": "P2U two value saves serialize on employee and retain both distinct keys",
      "ms": 5041.1841,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-concurrency.integration.cjs",
      "name": "P2U a transfer holding the employee row forces the waiting writer to recheck branch after lock",
      "ms": 79.8097,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-concurrency.integration.cjs",
      "name": "P2U malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
      "ms": 133.8278,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":true,\"case\":\"restriction-read-write\",\"reader\":\"old-public\",\"writer\":200,\"subsequentRead\":\"hidden\"}",
    "{\"rcsi\":true,\"case\":\"branch-read-write\",\"reader\":\"old-A\",\"writer\":200,\"subsequentOldBranch\":404}",
    "{\"rcsi\":true,\"case\":\"save-response-transfer\",\"saved\":200,\"response\":\"committed-A\",\"subsequentOldBranch\":404}",
    "{\"rcsi\":true,\"parallelSaves\":[200,200],\"bothKeysPreserved\":true}",
    "{\"rcsi\":true,\"writeAfterMove\":404,\"noWrite\":true}",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15865.0381"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_lock_consistency_test_9c66b142eb476fbf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_lock_consistency_test_9c66b142eb476fbf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_lock_consistency_test_9c66b142eb476fbf\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_concurrency_test_6dd5bb23881dc17e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_concurrency_test_6dd5bb23881dc17e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_concurrency_test_6dd5bb23881dc17e\"}\n"
  ]
}
