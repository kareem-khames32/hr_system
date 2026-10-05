module.exports = {
  "selected": [
    "codex-review-p2e-boundaries"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 8302.6062
  },
  "results": [
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E added request events are atomic: outbox failure rolls back submission and return",
      "ms": 5463.991,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"added-event-atomicity\",\"submit\":500,\"return\":500,\"requestsUnchanged\":true,\"actionsUnchanged\":true}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8302.6062"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2e_boundaries_test_b54e3fa197a91b67\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2e_boundaries_test_b54e3fa197a91b67\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2e_boundaries_test_b54e3fa197a91b67\"}\n"
  ]
}
