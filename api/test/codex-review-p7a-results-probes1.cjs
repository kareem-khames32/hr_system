module.exports = {
  "selected": [
    "codex-review-p7a-audience",
    "codex-review-p7a-overtime",
    "codex-review-p7a-dashboard",
    "codex-review-p7a-channels"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 2,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 31822.0528
  },
  "results": [
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A01: saved team audience still reaches the old branch after its team moves away",
      "ms": 12134.128,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A02: a new units audience with an empty selection opens a module for everybody",
      "ms": 36.7744,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O01: updating an overtime audience needs a second pooled connection while holding its transaction",
      "ms": 11889.1019,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O02: ten concurrent overtime updates exhaust the pool on the new audience reader",
      "ms": 2117.1554,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D01: task card reveals current employee name outside its reader branch",
      "ms": 11047.1804,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D02: dashboard cache continues exposing names and phones after a transfer",
      "ms": 232.2474,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.phone))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.phone))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.phone))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:66:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 10957.9852,
      "pass": false,
      "error": "notifications.savePreference is not a function",
      "cause": "notifications.savePreference is not a function",
      "stack": "TypeError: notifications.savePreference is not a function\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-channels.integration.cjs:100:23)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N02: branch-scoped WhatsApp contact write survives a transfer after authorization",
      "ms": 53.8844,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D02: dashboard cache continues exposing names and phones after a transfer",
      "ms": 232.2474,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.phone))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.phone))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.phone))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:66:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 10957.9852,
      "pass": false,
      "error": "notifications.savePreference is not a function",
      "cause": "notifications.savePreference is not a function",
      "stack": "TypeError: notifications.savePreference is not a function\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-channels.integration.cjs:100:23)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"P7A-A01\",\"movedTeamBranch\":2,\"savedAudienceBranch\":1,\"delivered\":true}",
    "{\"case\":\"P7A-A02\",\"status\":200,\"storedAudience\":null,\"otherBranchAllowed\":true}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_e837e31f2558648c",
    "{\"case\":\"P7A-O01\",\"externalAudienceReadsInsideTransaction\":1}",
    "{\"case\":\"P7A-O02\",\"occupied\":10,\"statuses\":[500,500,500,500,500,500,500,500,500,500]}",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_2d183059bc0c2793",
    "{\"case\":\"P7A-D01\",\"status\":200,\"foreignEmployeeNameDisclosed\":true}",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_f2b4269c9f6eb79a",
    "{\"case\":\"P7A-N02\",\"response\":404,\"savedAfterTransfer\":true}",
    "Cleanup verified: hr_notify_channels_test_260b2da1f9d4752f is absent from sys.databases.",
    "tests 8",
    "suites 0",
    "pass 6",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 31822.0528"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_e837e31f2558648c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_e837e31f2558648c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_2d183059bc0c2793\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_2d183059bc0c2793\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_f2b4269c9f6eb79a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_f2b4269c9f6eb79a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_260b2da1f9d4752f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_260b2da1f9d4752f\"}\n"
  ]
}
