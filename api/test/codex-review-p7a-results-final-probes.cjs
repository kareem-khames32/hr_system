module.exports = {
  "selected": [
    "codex-review-p7a-audience",
    "codex-review-p7a-overtime",
    "codex-review-p7a-dashboard",
    "codex-review-p7a-channels"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 11,
      "failed": 0,
      "passed": 11,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 11,
      "suites": 0
    },
    "duration_ms": 29245.1774
  },
  "results": [
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A01: saved team audience still reaches the old branch after its team moves away",
      "ms": 10181.8739,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A02: a new units audience with an empty selection opens a module for everybody",
      "ms": 31.888,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O01: updating an overtime audience needs a second pooled connection while holding its transaction",
      "ms": 10098.1112,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O02: ten concurrent overtime updates exhaust the pool on the new audience reader",
      "ms": 2043.7218,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O03: overtime list exposes a team current name after its department changes branch",
      "ms": 67.2332,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O04 control: ten audience reads using their already-held transaction do not exhaust the pool",
      "ms": 460.489,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D01: task card reveals current employee name outside its reader branch",
      "ms": 10544.2002,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D02: dashboard cache continues exposing names and phones after a transfer",
      "ms": 433.1813,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D03: a confidential custom definition is counted through a department filter",
      "ms": 154.9952,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 10351.486,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N02: branch-scoped WhatsApp contact write survives a transfer after authorization",
      "ms": 44.4867,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7A-A01\",\"movedTeamBranch\":2,\"savedAudienceBranch\":1,\"delivered\":true}",
    "{\"case\":\"P7A-A02\",\"status\":200,\"storedAudience\":null,\"otherBranchAllowed\":true}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_3a16558dea8dca32",
    "{\"case\":\"P7A-O01\",\"externalAudienceReadsInsideTransaction\":1}",
    "{\"case\":\"P7A-O02\",\"occupied\":10,\"statuses\":[500,500,500,500,500,500,500,500,500,500]}",
    "{\"case\":\"P7A-O03\",\"foreignTeamNameDisclosed\":true}",
    "{\"case\":\"P7A-O04\",\"occupied\":10,\"statuses\":[200,200,200,200,200,200,200,200,200,200]}",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_ead2e29b63473ed9",
    "{\"case\":\"P7A-D01\",\"status\":200,\"foreignEmployeeNameDisclosed\":true}",
    "{\"case\":\"P7A-D02\",\"cachedLeak\":true,\"freshReadLeak\":false}",
    "{\"case\":\"P7A-D03\",\"secretDefinitionInDepartmentCount\":true,\"directSecretTypeHidden\":true}",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_bcb15f84fb291f13",
    "{\"case\":\"P7A-N01\",\"channelDisabled\":true,\"emailSent\":true}",
    "{\"case\":\"P7A-N02\",\"response\":404,\"savedAfterTransfer\":true}",
    "Cleanup verified: hr_notify_channels_test_66fc18456f79b9da is absent from sys.databases.",
    "tests 11",
    "suites 0",
    "pass 11",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 29245.1774"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_3a16558dea8dca32\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_3a16558dea8dca32\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_ead2e29b63473ed9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_ead2e29b63473ed9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_bcb15f84fb291f13\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_bcb15f84fb291f13\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_66fc18456f79b9da\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_66fc18456f79b9da\"}\n"
  ]
}
