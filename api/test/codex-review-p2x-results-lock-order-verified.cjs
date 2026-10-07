module.exports = {
  "selected": [
    "codex-review-p2x-lock-order"
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
    "duration_ms": 14072.7535
  },
  "results": [
    {
      "file": "codex-review-p2x-lock-order.integration.cjs",
      "name": "P2X characterize bank approval versus suspension lock order, including the previous unlocked-read behavior",
      "ms": 11780.2068,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"bank-suspension-lock-order\",\"outcomes\":[{\"oldRead\":false,\"approval\":201,\"suspension\":500,\"sqlError\":1205,\"request\":\"COMPLETED\"},{\"oldRead\":true,\"approval\":201,\"suspension\":500,\"sqlError\":1205,\"request\":\"COMPLETED\"}]}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14072.7535"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2x_lock_order_test_d582eb78f5129552\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2x_lock_order_test_d582eb78f5129552\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2x_lock_order_test_d582eb78f5129552\"}\n"
  ]
}
