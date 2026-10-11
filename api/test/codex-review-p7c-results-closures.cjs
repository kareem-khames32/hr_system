module.exports = {
  "selected": [
    "codex-review-p7c-audience",
    "codex-review-p7c-channels"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 12,
      "failed": 0,
      "passed": 12,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 12,
      "suites": 0
    },
    "duration_ms": 13336.8677
  },
  "results": [
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A01: saved team audience excludes the old branch after its team moves away",
      "ms": 9460.9981,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A02: empty new units audience is rejected and does not alter the module",
      "ms": 17.5138,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A03: group creation serializes before transfer, then rejects the moved employee",
      "ms": 262.8991,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A04 closure: moving the team closes module access immediately without invalidation",
      "ms": 167.5461,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A05: malformed new audiences reject writes and match nobody in preview",
      "ms": 128.9587,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A06: moved unit or parent fails closed; the database rejects a dangling team department",
      "ms": 110.5625,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A07: transfer committed after audience scan but before its employee lock leaves no task",
      "ms": 22.7317,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-channels.integration.cjs",
      "name": "P7C-N01: daily digest respects an event email channel disabled before sending",
      "ms": 9533.8313,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-channels.integration.cjs",
      "name": "P7C-N02: WhatsApp contact write holds the employee lock until commit",
      "ms": 257.0776,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-channels.integration.cjs",
      "name": "P7C-N03 closure: the next recipient respects email disabled during the batch",
      "ms": 411.4142,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-channels.integration.cjs",
      "name": "P7C-N04: failed digest rechecks the event rule on its next attempt",
      "ms": 190.8897,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-channels.integration.cjs",
      "name": "P7C-N05: transfer before the contact lock rejects the write without changing the saved number",
      "ms": 18.6654,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7C-A01\",\"movedTeamBranch\":2,\"savedAudienceBranch\":1,\"delivered\":false}",
    "{\"case\":\"P7C-A02\",\"status\":400,\"unchanged\":true}",
    "{\"case\":\"P7C-A03\",\"transferWaited\":true,\"createdBeforeTransfer\":1,\"afterTransfer\":400}",
    "{\"case\":\"P7C-A04\",\"movedByHttp\":true,\"transactionReader\":false,\"cached\":404,\"afterInvalidation\":404}",
    "{\"case\":\"P7C-A05\",\"shapes\":5,\"writesRejected\":15}",
    "{\"case\":\"P7C-A06\",\"movedParentIncluded\":false,\"movedChildIncluded\":false,\"danglingDepartmentRejected\":true}",
    "{\"case\":\"P7C-A07\",\"transferCommittedBeforeLock\":true,\"status\":400,\"tasks\":0}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_da058a8663156be9",
    "{\"case\":\"P7C-N01\",\"channelDisabled\":true,\"emailSent\":false}",
    "{\"case\":\"P7C-N02\",\"response\":404,\"transferWaited\":true,\"afterTransfer\":404}",
    "{\"case\":\"P7C-N03\",\"firstRecipientSent\":1,\"adminDisabledBeforeSecond\":true,\"secondRecipientStillSent\":0}",
    "{\"case\":\"P7C-N04\",\"retrySent\":0,\"status\":\"SKIPPED\"}",
    "{\"case\":\"P7C-N05\",\"transferCommittedBeforeLock\":true,\"status\":404,\"numberUnchanged\":true}",
    "Cleanup verified: hr_notify_channels_test_28ca4d169416f8e7 is absent from sys.databases.",
    "tests 12",
    "suites 0",
    "pass 12",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13336.8677"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_da058a8663156be9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_da058a8663156be9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_28ca4d169416f8e7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_28ca4d169416f8e7\"}\n"
  ]
}
