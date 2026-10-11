module.exports = {
  "selected": [
    "codex-review-p7d-channels"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 16092.8369
  },
  "results": [
    {
      "file": "codex-review-p7d-channels.integration.cjs",
      "name": "P7D-N01: daily digest respects an event email channel disabled before sending",
      "ms": 11023.0408,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-channels.integration.cjs",
      "name": "P7D-N02: WhatsApp contact write holds the employee lock until commit",
      "ms": 253.6828,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-channels.integration.cjs",
      "name": "P7D-N03 closure: the next recipient respects email disabled during the batch",
      "ms": 503.082,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-channels.integration.cjs",
      "name": "P7D-N04: failed digest rechecks the event rule on its next attempt",
      "ms": 226.1141,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-channels.integration.cjs",
      "name": "P7D-N05: transfer before the contact lock rejects the write without changing the saved number",
      "ms": 19.3522,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-channels.integration.cjs",
      "name": "P7D-N06: mixed digest retains open events and skips only the closed event",
      "ms": 386.6887,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-channels.integration.cjs",
      "name": "P7D-N07 closure: handover precedes a blocked skip-record write",
      "ms": 598.4857,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7D-N01\",\"channelDisabled\":true,\"emailSent\":false}",
    "{\"case\":\"P7D-N02\",\"response\":404,\"transferWaited\":true,\"afterTransfer\":404}",
    "{\"case\":\"P7D-N03\",\"firstRecipientSent\":1,\"adminDisabledBeforeSecond\":true,\"secondRecipientStillSent\":0}",
    "{\"case\":\"P7D-N04\",\"retrySent\":0,\"status\":\"SKIPPED\"}",
    "{\"case\":\"P7D-N05\",\"transferCommittedBeforeLock\":true,\"status\":404,\"numberUnchanged\":true}",
    "{\"case\":\"P7D-N06\",\"messages\":1,\"openEvent\":\"SENT\",\"closedEvent\":\"SKIPPED\"}",
    "{\"case\":\"P7D-N07\",\"realSqlWait\":true,\"handoverBeforeAdminSave\":true,\"eventEmail\":false,\"messagesBeforeSave\":1,\"requestStatus\":\"SENT\"}",
    "Cleanup verified: hr_codex_p7d_channels_test_3d249f9dfc7d6ae3 is absent from sys.databases.",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16092.8369"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p7d_channels_test_3d249f9dfc7d6ae3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p7d_channels_test_3d249f9dfc7d6ae3\"}\n"
  ]
}
