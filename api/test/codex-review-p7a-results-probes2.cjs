module.exports = {
  "selected": [
    "codex-review-p7a-dashboard",
    "codex-review-p7a-channels"
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
    "duration_ms": 15805.1593
  },
  "results": [
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D02: dashboard cache continues exposing names and phones after a transfer",
      "ms": 12520.2618,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 12304.7209,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7A-D02\",\"cachedLeak\":true,\"freshReadLeak\":false}",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_b932c4ecf5a3e3f3",
    "{\"case\":\"P7A-N01\",\"channelDisabled\":true,\"emailSent\":true}",
    "Cleanup verified: hr_notify_channels_test_34f6a4fa147730f1 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15805.1593"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_b932c4ecf5a3e3f3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_b932c4ecf5a3e3f3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_34f6a4fa147730f1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_34f6a4fa147730f1\"}\n"
  ]
}
