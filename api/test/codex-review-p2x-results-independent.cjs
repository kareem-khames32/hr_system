module.exports = {
  "selected": [
    "codex-review-p2x-independent",
    "codex-review-p2x-virtual-parity"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 10508.6096
  },
  "results": [
    {
      "file": "codex-review-p2x-independent.integration.cjs",
      "name": "P2X profile opening balance and contract form one ordered operation before rehire",
      "ms": 5034.0658,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-independent.integration.cjs",
      "name": "P2X an old balance check crossing rehire remains read-only",
      "ms": 177.8526,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-independent.integration.cjs",
      "name": "P2X old pending approval rechecks after rehire and leaves no row on failure or retry",
      "ms": 211.283,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-virtual-parity.integration.cjs",
      "name": "P2X virtual entries equal materialized entries for calendar, anniversary, clipped and historical windows",
      "ms": 8001.899,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-virtual-parity.integration.cjs",
      "name": "P2X missing untyped balance rejects without creating a row; sick and leap-day anniversary match saved behavior",
      "ms": 44.1757,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"opening-order\",\"current\":0,\"frozen\":10,\"sqlWaitObserved\":true}",
    "{\"case\":\"read-only-old-context\",\"oldAnniversaryRow\":false,\"sameAsReference\":true}",
    "{\"case\":\"approval-after-rehire\",\"first\":{\"message\":\"لم يُعتمد الطلب — الرصيد غير كافٍ عند التنفيذ — المتبقي 1.67 يوم. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400},\"retry\":{\"message\":\"الرصيد غير كافٍ: المتبقي 1.67 يوم والمطلوب 3\",\"error\":\"Bad Request\",\"statusCode\":400},\"noLeaveOrBalanceOrApproval\":true}",
    "{\"case\":\"virtual-materialized-parity\",\"comparisons\":108}",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10508.6096"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2x_independent_test_2d278df207354d97\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2x_independent_test_2d278df207354d97\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2x_independent_test_2d278df207354d97\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2x_virtual_parity_test_ee80abe8352d88a8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2x_virtual_parity_test_ee80abe8352d88a8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2x_virtual_parity_test_ee80abe8352d88a8\"}\n"
  ]
}
