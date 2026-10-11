module.exports = {
  "selected": [
    "codex-review-p7b-audience",
    "codex-review-p7b-overtime",
    "codex-review-p7b-dashboard",
    "codex-review-p7b-channels"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 18,
      "failed": 0,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 18,
      "suites": 0
    },
    "duration_ms": 39453.6787
  },
  "results": [
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A01: saved team audience excludes the old branch after its team moves away",
      "ms": 14271.0101,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A02: empty new units audience is rejected and does not alter the module",
      "ms": 21.2132,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A03: group creation serializes before transfer, then rejects the moved employee",
      "ms": 288.4975,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A04 defect: cached module subject retains a moved team until invalidation",
      "ms": 208.1352,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A05: malformed new audiences reject writes and match nobody in preview",
      "ms": 173.6704,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A06: moved unit or parent fails closed; the database rejects a dangling team department",
      "ms": 192.7791,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O01: updating an overtime audience does not acquire a second pooled connection",
      "ms": 13801.2748,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O02: ten concurrent overtime updates succeed with every pool connection occupied",
      "ms": 675.5795,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O03: overtime list hides a foreign team name after its department changes branch",
      "ms": 81.6214,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O04 control: ten audience reads using their already-held transaction do not exhaust the pool",
      "ms": 618.0649,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-M01 control: migration 186 rejects an unexpected column before changing the table",
      "ms": 256.6751,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-dashboard.integration.cjs",
      "name": "P7B-D01: task card hides current employee name outside its reader branch",
      "ms": 14455.6709,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-dashboard.integration.cjs",
      "name": "P7B-D02: dashboard immediately removes names and phones after a transfer",
      "ms": 340.9131,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-dashboard.integration.cjs",
      "name": "P7B-D03: a confidential custom definition is excluded from department counts",
      "ms": 103.564,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N01: daily digest respects an event email channel disabled before sending",
      "ms": 14607.8582,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N02: WhatsApp contact write holds the employee lock until commit",
      "ms": 250.0796,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N03 defect: the next recipient uses the previous event rule after admin disables email during a batch",
      "ms": 388.585,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N04: failed digest rechecks the event rule on its next attempt",
      "ms": 233.5598,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7B-A01\",\"movedTeamBranch\":2,\"savedAudienceBranch\":1,\"delivered\":false}",
    "{\"case\":\"P7B-A02\",\"status\":400,\"unchanged\":true}",
    "{\"case\":\"P7B-A03\",\"transferWaited\":true,\"createdBeforeTransfer\":1,\"afterTransfer\":400}",
    "{\"case\":\"P7B-A04\",\"movedByHttp\":true,\"transactionReader\":false,\"cached\":200,\"afterInvalidation\":404}",
    "{\"case\":\"P7B-A05\",\"shapes\":5,\"writesRejected\":15}",
    "{\"case\":\"P7B-A06\",\"movedParentIncluded\":false,\"movedChildIncluded\":false,\"danglingDepartmentRejected\":true}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_01acf93ec5455fd9",
    "{\"case\":\"P7B-O01\",\"externalAudienceReadsInsideTransaction\":0}",
    "{\"case\":\"P7B-O02\",\"occupied\":10,\"statuses\":[200,200,200,200,200,200,200,200,200,200]}",
    "{\"case\":\"P7B-O03\",\"foreignTeamNameDisclosed\":false}",
    "{\"case\":\"P7B-O04\",\"occupied\":10,\"statuses\":[200,200,200,200,200,200,200,200,200,200]}",
    "{\"case\":\"P7B-M01\",\"rejectsWrongShapeWithoutRepairingIt\":true}",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_ad994f8d386499e3",
    "{\"case\":\"P7B-D01\",\"status\":200,\"foreignEmployeeNameDisclosed\":false}",
    "{\"case\":\"P7B-D02\",\"cachedLeak\":false,\"freshReadLeak\":false}",
    "{\"case\":\"P7B-D03\",\"secretDefinitionInDepartmentCount\":false,\"directSecretTypeHidden\":true}",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_b8a4e4251596851d",
    "{\"case\":\"P7B-N01\",\"channelDisabled\":true,\"emailSent\":false}",
    "{\"case\":\"P7B-N02\",\"response\":404,\"transferWaited\":true,\"afterTransfer\":404}",
    "{\"case\":\"P7B-N03\",\"firstRecipientSent\":1,\"adminDisabledBeforeSecond\":true,\"secondRecipientStillSent\":1}",
    "{\"case\":\"P7B-N04\",\"retrySent\":0,\"status\":\"SKIPPED\"}",
    "Cleanup verified: hr_notify_channels_test_f23eaa39b43013fa is absent from sys.databases.",
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 39453.6787"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_01acf93ec5455fd9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_01acf93ec5455fd9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_ad994f8d386499e3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_ad994f8d386499e3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_b8a4e4251596851d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_b8a4e4251596851d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_f23eaa39b43013fa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_f23eaa39b43013fa\"}\n"
  ]
}
