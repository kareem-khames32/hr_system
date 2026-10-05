module.exports = {
  "selected": [
    "codex-review-p2i-closure"
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
    "duration_ms": 7793.9029
  },
  "results": [
    {
      "file": "codex-review-p2i-closure.integration.cjs",
      "name": "P2I confidential execution access, hidden task proof and post-completion party rights remain bounded",
      "ms": 4810.2881,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-closure.integration.cjs",
      "name": "P2I failed completion event rolls task and request and approval history back together",
      "ms": 204.3787,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-closure.integration.cjs",
      "name": "P2I a current confidential execution party should remain a party in the pending report and reject-execution action",
      "ms": 217.6751,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"execution-party-bounds\",\"hidden\":404,\"viewerClose\":403,\"viewerReject\":403,\"ownerStatus\":\"COMPLETED\",\"storedExecutions\":1}",
    "{\"case\":\"execution-event-atomicity\",\"failedStatus\":500,\"allRowsUnchanged\":true,\"retryExecutions\":1}",
    "{\"case\":\"execution-party-consistency\",\"detailMasked\":false,\"reportMasked\":false,\"rejectStatus\":201,\"message\":null,\"requestStatus\":\"REJECTED\"}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7793.9029"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2i_execution_test_60f635395fd77f33\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2i_execution_test_60f635395fd77f33\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2i_execution_test_60f635395fd77f33\"}\n"
  ]
}
