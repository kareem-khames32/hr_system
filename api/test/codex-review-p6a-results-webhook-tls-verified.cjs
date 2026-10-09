module.exports = {
  "selected": [
    "codex-review-p6a-webhooks"
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
    "duration_ms": 11844.3842
  },
  "results": [
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 8999.7529,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "P6A-W01: hostname is resolved again after the public-address check (local TLS receiver only)",
      "ms": 138.0272,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"checkedPublicAddress\":true,\"secondResolution\":true,\"localReceiverRequests\":1,\"outcome\":\"SENT\"}",
    "Cleanup verified: hr_webhooks_test_342200a25720fc08 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11844.3842"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_342200a25720fc08\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_342200a25720fc08\"}\n"
  ]
}
