module.exports = {
  "selected": [
    "codex-review-p2u-lock-consistency"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 7328.87
  },
  "results": [
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U reader cannot return a value written after restriction; writer waits on real application lock",
      "ms": 4632.0076,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U reader before branch transfer gets only pre-transfer value; new branch writer waits",
      "ms": 119.3134,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U saved response remains inside transaction; transfer blocks until response is built",
      "ms": 58.3463,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-lock-consistency.integration.cjs",
      "name": "P2U concurrent definition update with value save completes without losing either result",
      "ms": 84.8641,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":false,\"case\":\"restriction-read-write\",\"reader\":\"old-public\",\"writer\":200,\"subsequentRead\":\"hidden\"}",
    "{\"rcsi\":false,\"case\":\"branch-read-write\",\"reader\":\"old-A\",\"writer\":200,\"subsequentOldBranch\":404}",
    "{\"rcsi\":false,\"case\":\"save-response-transfer\",\"saved\":200,\"response\":\"committed-A\",\"subsequentOldBranch\":404}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7328.87"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_lock_consistency_test_8c8659914733cfe2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_lock_consistency_test_8c8659914733cfe2\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_lock_consistency_test_8c8659914733cfe2\"}\n"
  ]
}
