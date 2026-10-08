module.exports = {
  "selected": [
    "codex-review-p3l-surveys",
    "codex-review-p3l-policy-pool"
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
    "duration_ms": 21622.7267
  },
  "results": [
    {
      "file": "codex-review-p3l-surveys.integration.cjs",
      "name": "P3L-S01 control: open results blocked, sparse question hidden, closed survey cannot reopen",
      "ms": 14871.9126,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-surveys.integration.cjs",
      "name": "P3L-S02: optional question leaks hidden group by complementary subtraction",
      "ms": 242.8321,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-surveys.integration.cjs",
      "name": "P3L-S03: response inserted after close changes already published anonymous result",
      "ms": 169.6375,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-policy-pool.integration.cjs",
      "name": "P3L-K02: ten article updates exhaust pool while referenceFor needs an eleventh connection",
      "ms": 15779.0501,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 21622.7267"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3l_surveys_test_d1915181e7eefbea\"}\n",
    "REVIEW_MEASURE {\"case\":\"S01\",\"openResults\":400,\"sparseHidden\":true,\"reopen\":400}\n",
    "REVIEW_MEASURE {\"case\":\"S02\",\"groupBHidden\":true,\"inferredAnswerCount\":1,\"inferredCounts\":[0,1]}\n",
    "REVIEW_MEASURE {\"case\":\"S03\",\"beforeStatus\":\"CLOSED\",\"afterStatus\":\"CLOSED\",\"before\":5,\"after\":6,\"delta\":[0,1]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3l_surveys_test_d1915181e7eefbea\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3l_surveys_test_d1915181e7eefbea\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3l_policy_pool_test_8a8375e92404c7e8\"}\n",
    "REVIEW_MEASURE {\"case\":\"K02\",\"occupied\":{\"used\":10,\"free\":0,\"max\":10,\"referenceCalls\":10},\"pendingReads\":10,\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"acquireTimeoutMs\":1500}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3l_policy_pool_test_8a8375e92404c7e8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3l_policy_pool_test_8a8375e92404c7e8\"}\n"
  ]
}
