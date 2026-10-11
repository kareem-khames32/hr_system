module.exports = {
  "selected": [
    "codex-review-p7b-audience",
    "codex-review-p7b-channels"
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
    "duration_ms": 13742.2865
  },
  "results": [
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A07: transfer committed after audience scan but before its employee lock leaves no task",
      "ms": 10609.2714,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N05: transfer before the contact lock rejects the write without changing the saved number",
      "ms": 10418.3818,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7B-A07\",\"transferCommittedBeforeLock\":true,\"status\":400,\"tasks\":0}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_f56eed7a2f0db033",
    "{\"case\":\"P7B-N05\",\"transferCommittedBeforeLock\":true,\"status\":404,\"numberUnchanged\":true}",
    "Cleanup verified: hr_notify_channels_test_ce0a1418d8742550 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13742.2865"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_f56eed7a2f0db033\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_f56eed7a2f0db033\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_ce0a1418d8742550\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_ce0a1418d8742550\"}\n"
  ]
}
