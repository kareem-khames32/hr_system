module.exports = {
  "selected": [
    "codex-review-p7b-channels"
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
    "duration_ms": 18081.1789
  },
  "results": [
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 13263.6545,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N02: branch-scoped WhatsApp contact write survives a transfer after authorization",
      "ms": 308.0325,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N03 defect: the next recipient uses the previous event rule after admin disables email during a batch",
      "ms": 660.6459,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N04: failed digest rechecks the event rule on its next attempt",
      "ms": 272.4364,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7B-N01\",\"channelDisabled\":true,\"emailSent\":false}",
    "{\"case\":\"P7B-N02\",\"response\":404,\"transferWaited\":true,\"afterTransfer\":404}",
    "{\"case\":\"P7B-N03\",\"firstRecipientSent\":1,\"adminDisabledBeforeSecond\":true,\"secondRecipientStillSent\":1}",
    "{\"case\":\"P7B-N04\",\"retrySent\":0,\"status\":\"SKIPPED\"}",
    "Cleanup verified: hr_notify_channels_test_13271f9510b7ce7f is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18081.1789"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_13271f9510b7ce7f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_13271f9510b7ce7f\"}\n"
  ]
}
