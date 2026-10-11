module.exports = {
  "selected": [
    "codex-review-p7c-channels"
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
    "duration_ms": 12156.4936
  },
  "results": [
    {
      "file": "codex-review-p7c-channels.integration.cjs",
      "name": "P7C-N06: mixed digest retains open events and skips only the closed event",
      "ms": 8889.8427,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-channels.integration.cjs",
      "name": "P7C-N07 probe: a blocked skip-record write separates the final event check from mail submission",
      "ms": 540.8006,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7C-N06\",\"messages\":1,\"openEvent\":\"SENT\",\"closedEvent\":\"SKIPPED\"}",
    "{\"case\":\"P7C-N07\",\"realSqlWait\":true,\"adminSavedBeforeMail\":true,\"eventEmail\":false,\"messagesAfterSave\":1,\"requestStatus\":\"SENT\"}",
    "Cleanup verified: hr_notify_channels_test_ecfae2bad83fa48d is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12156.4936"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_ecfae2bad83fa48d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_ecfae2bad83fa48d\"}\n"
  ]
}
