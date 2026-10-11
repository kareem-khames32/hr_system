module.exports = {
  "selected": [
    "codex-review-p7b-audience",
    "codex-review-p7b-overtime",
    "codex-review-p7b-dashboard",
    "codex-review-p7b-channels"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 14,
      "failed": 1,
      "passed": 13,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 14,
      "suites": 0
    },
    "duration_ms": 34164.8558
  },
  "results": [
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A01: saved team audience still reaches the old branch after its team moves away",
      "ms": 11298.8759,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A02: empty new units audience is rejected and does not alter the module",
      "ms": 18.2743,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A03: group creation serializes before transfer, then rejects the moved employee",
      "ms": 277.3647,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A04 defect: cached module subject retains a moved team until invalidation",
      "ms": 104.6232,
      "pass": false,
      "error": "{\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "cause": "{\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n\n    at expect (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7b-audience.integration.cjs:31:47)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7b-audience.integration.cjs:88:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O01: updating an overtime audience needs a second pooled connection while holding its transaction",
      "ms": 11241.6471,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O02: ten concurrent overtime updates exhaust the pool on the new audience reader",
      "ms": 631.1347,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O03: overtime list exposes a team current name after its department changes branch",
      "ms": 68.7667,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-O04 control: ten audience reads using their already-held transaction do not exhaust the pool",
      "ms": 475.1391,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-overtime.integration.cjs",
      "name": "P7B-M01 control: migration 186 rejects an unexpected column before changing the table",
      "ms": 228.6141,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-dashboard.integration.cjs",
      "name": "P7B-D01: task card reveals current employee name outside its reader branch",
      "ms": 14298.6709,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-dashboard.integration.cjs",
      "name": "P7B-D02: dashboard cache continues exposing names and phones after a transfer",
      "ms": 464.8968,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-dashboard.integration.cjs",
      "name": "P7B-D03: a confidential custom definition is counted through a department filter",
      "ms": 163.5794,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 14121.5841,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-channels.integration.cjs",
      "name": "P7B-N02: branch-scoped WhatsApp contact write survives a transfer after authorization",
      "ms": 271.1066,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A04 defect: cached module subject retains a moved team until invalidation",
      "ms": 104.6232,
      "pass": false,
      "error": "{\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "cause": "{\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n\n    at expect (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7b-audience.integration.cjs:31:47)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7b-audience.integration.cjs:88:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"P7B-A01\",\"movedTeamBranch\":2,\"savedAudienceBranch\":1,\"delivered\":false}",
    "{\"case\":\"P7B-A02\",\"status\":400,\"unchanged\":true}",
    "{\"case\":\"P7B-A03\",\"transferWaited\":true,\"createdBeforeTransfer\":1,\"afterTransfer\":400}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_afdf9496f455eb86",
    "{\"case\":\"P7B-O01\",\"externalAudienceReadsInsideTransaction\":0}",
    "{\"case\":\"P7B-O02\",\"occupied\":10,\"statuses\":[200,200,200,200,200,200,200,200,200,200]}",
    "{\"case\":\"P7B-O03\",\"foreignTeamNameDisclosed\":false}",
    "{\"case\":\"P7B-O04\",\"occupied\":10,\"statuses\":[200,200,200,200,200,200,200,200,200,200]}",
    "{\"case\":\"P7B-M01\",\"rejectsWrongShapeWithoutRepairingIt\":true}",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_b34e547e482dc0b2",
    "{\"case\":\"P7B-D01\",\"status\":200,\"foreignEmployeeNameDisclosed\":false}",
    "{\"case\":\"P7B-D02\",\"cachedLeak\":false,\"freshReadLeak\":false}",
    "{\"case\":\"P7B-D03\",\"secretDefinitionInDepartmentCount\":false,\"directSecretTypeHidden\":true}",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_8ecd0045317d6711",
    "{\"case\":\"P7B-N01\",\"channelDisabled\":true,\"emailSent\":false}",
    "{\"case\":\"P7B-N02\",\"response\":404,\"transferWaited\":true,\"afterTransfer\":404}",
    "Cleanup verified: hr_notify_channels_test_545655bf56d83392 is absent from sys.databases.",
    "tests 14",
    "suites 0",
    "pass 13",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 34164.8558"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_afdf9496f455eb86\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_afdf9496f455eb86\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_b34e547e482dc0b2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_b34e547e482dc0b2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_8ecd0045317d6711\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_8ecd0045317d6711\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_545655bf56d83392\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_545655bf56d83392\"}\n"
  ]
}
