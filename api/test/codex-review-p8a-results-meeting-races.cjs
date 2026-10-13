module.exports = {
  "selected": [
    "codex-review-p8a-meeting-races"
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
    "duration_ms": 21583.0562
  },
  "results": [
    {
      "file": "codex-review-p8a-meeting-races.integration.cjs",
      "name": "P8A-M01: call closed before token issuance still yields a signed join grant",
      "ms": 16998.6992,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-meeting-races.integration.cjs",
      "name": "P8A-M02: meeting ended before token issuance still yields a signed join grant",
      "ms": 142.8947,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_meet_calls_test_09dc1bae0af11609 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 21583.0562"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_meet_calls_test_09dc1bae0af11609\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-M01\",\"ended\":true,\"status\":200,\"roomJoin\":true,\"ttl\":null,\"freshStatus\":410}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-M02\",\"ended\":true,\"status\":200,\"roomJoin\":true,\"freshStatus\":410}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_meet_calls_test_09dc1bae0af11609\"}\n"
  ]
}
