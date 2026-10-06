module.exports = {
  "selected": [
    "codex-review-p2w-empty-row-approval"
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
    "duration_ms": 6862.6741
  },
  "results": [
    {
      "file": "codex-review-p2w-empty-row-approval.integration.cjs",
      "name": "P2W approval crossing rehire must not spend extra days from an empty stale-anniversary row",
      "ms": 4502.8052,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"empty-row-approval\",\"httpStatus\":400,\"response\":{\"message\":\"الرصيد غير كافٍ: المتبقي 1.67 يوم والمطلوب 3\",\"error\":\"Bad Request\",\"statusCode\":400},\"referenceRemaining\":1.67,\"approvedDays\":null,\"rows\":[{\"period\":\"2026\",\"taken\":0},{\"period\":\"2026\",\"taken\":0},{\"period\":\"2026-09-01\",\"taken\":0}]}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6862.6741"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2w_empty_row_approval_test_be573777c45cab35\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2w_empty_row_approval_test_be573777c45cab35\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2w_empty_row_approval_test_be573777c45cab35\"}\n"
  ]
}
