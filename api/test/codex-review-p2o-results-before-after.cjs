module.exports = {
  "selected": [
    "codex-review-p2o-before-after"
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
    "duration_ms": 12563.7209
  },
  "results": [
    {
      "file": "codex-review-p2o-before-after.integration.cjs",
      "name": "P2O one running process without 084-092: ordinary document survives, first post-migration operation records audit and outbox",
      "ms": 10162.4217,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"allNineAbsent\":true,\"migrations\":9,\"ordinaryResponseUnchanged\":true,\"auditAndOutboxImmediatelyRecorded\":true,\"rollbackVerified\":true,\"acknowledgementVerified\":true}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12563.7209"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_before_after_test_fae86e9d58fc29a9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_before_after_test_fae86e9d58fc29a9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_before_after_test_fae86e9d58fc29a9\"}\n"
  ]
}
