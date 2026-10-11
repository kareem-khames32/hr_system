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
      "tests": 13,
      "failed": 11,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 13,
      "suites": 0
    },
    "duration_ms": 58341.8865
  },
  "results": [
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A01: saved team audience still reaches the old branch after its team moves away",
      "ms": 11257.4966,
      "pass": false,
      "error": "Defect: out-of-branch team still delivers its old branch audience",
      "cause": "Defect: out-of-branch team still delivers its old branch audience",
      "stack": "AssertionError [ERR_ASSERTION]: Defect: out-of-branch team still delivers its old branch audience\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:48:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A02: a new units audience with an empty selection opens a module for everybody",
      "ms": 14.7694,
      "pass": false,
      "error": "{\"message\":\"اختار الإدارات أو الأقسام أو الفرق في جمهور التفعيل، أو خلّيه «كل الشركة»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"اختار الإدارات أو الأقسام أو الفرق في جمهور التفعيل، أو خلّيه «كل الشركة»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"اختار الإدارات أو الأقسام أو الفرق في جمهور التفعيل، أو خلّيه «كل الشركة»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at expect (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:31:47)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:54:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A03: group task commits after its employee has moved outside the assigning account scope",
      "ms": 15049.4662,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expect (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:31:47)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:72:18)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O01: updating an overtime audience needs a second pooled connection while holding its transaction",
      "ms": 10974.5642,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(externalReads > 0)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(externalReads > 0)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(externalReads > 0)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-overtime.integration.cjs:59:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O02: ten concurrent overtime updates exhaust the pool on the new audience reader",
      "ms": 581.1812,
      "pass": false,
      "error": "Defect: a transaction-bound read would succeed with the same held pool",
      "cause": "Defect: a transaction-bound read would succeed with the same held pool",
      "stack": "AssertionError [ERR_ASSERTION]: Defect: a transaction-bound read would succeed with the same held pool\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-overtime.integration.cjs:83:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O03: overtime list exposes a team current name after its department changes branch",
      "ms": 56.763,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7A private team in B'))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7A private team in B'))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7A private team in B'))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-overtime.integration.cjs:93:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O04 control: ten audience reads using their already-held transaction do not exhaust the pool",
      "ms": 492.1111,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-M01 control: migration 186 rejects an unexpected column before changing the table",
      "ms": 172.8849,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D01: task card reveals current employee name outside its reader branch",
      "ms": 10773.3837,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'P7A foreign branch private name'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'P7A foreign branch private name'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'P7A foreign branch private name'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:52:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D02: dashboard cache continues exposing names and phones after a transfer",
      "ms": 225.6944,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.fullName))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.fullName))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.fullName))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:65:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D03: a confidential custom definition is counted through a department filter",
      "ms": 81.9251,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n2 !== 3\n",
      "cause": "Expected values to be strictly equal:\n\n2 !== 3\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n2 !== 3\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:81:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 10186.9224,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(sent > 0)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(sent > 0)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(sent > 0)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-channels.integration.cjs:107:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N02: branch-scoped WhatsApp contact write survives a transfer after authorization",
      "ms": 15034.8978,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- '966500009999'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- '966500009999'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- '966500009999'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-channels.integration.cjs:127:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A01: saved team audience still reaches the old branch after its team moves away",
      "ms": 11257.4966,
      "pass": false,
      "error": "Defect: out-of-branch team still delivers its old branch audience",
      "cause": "Defect: out-of-branch team still delivers its old branch audience",
      "stack": "AssertionError [ERR_ASSERTION]: Defect: out-of-branch team still delivers its old branch audience\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:48:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A02: a new units audience with an empty selection opens a module for everybody",
      "ms": 14.7694,
      "pass": false,
      "error": "{\"message\":\"اختار الإدارات أو الأقسام أو الفرق في جمهور التفعيل، أو خلّيه «كل الشركة»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"اختار الإدارات أو الأقسام أو الفرق في جمهور التفعيل، أو خلّيه «كل الشركة»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"اختار الإدارات أو الأقسام أو الفرق في جمهور التفعيل، أو خلّيه «كل الشركة»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at expect (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:31:47)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:54:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A03: group task commits after its employee has moved outside the assigning account scope",
      "ms": 15049.4662,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expect (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:31:47)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-audience.integration.cjs:72:18)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O01: updating an overtime audience needs a second pooled connection while holding its transaction",
      "ms": 10974.5642,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(externalReads > 0)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(externalReads > 0)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(externalReads > 0)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-overtime.integration.cjs:59:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O02: ten concurrent overtime updates exhaust the pool on the new audience reader",
      "ms": 581.1812,
      "pass": false,
      "error": "Defect: a transaction-bound read would succeed with the same held pool",
      "cause": "Defect: a transaction-bound read would succeed with the same held pool",
      "stack": "AssertionError [ERR_ASSERTION]: Defect: a transaction-bound read would succeed with the same held pool\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-overtime.integration.cjs:83:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O03: overtime list exposes a team current name after its department changes branch",
      "ms": 56.763,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7A private team in B'))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7A private team in B'))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7A private team in B'))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-overtime.integration.cjs:93:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D01: task card reveals current employee name outside its reader branch",
      "ms": 10773.3837,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'P7A foreign branch private name'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'P7A foreign branch private name'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'P7A foreign branch private name'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:52:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D02: dashboard cache continues exposing names and phones after a transfer",
      "ms": 225.6944,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.fullName))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.fullName))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(JSON.stringify(body).includes(E.j3.fullName))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:65:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D03: a confidential custom definition is counted through a department filter",
      "ms": 81.9251,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n2 !== 3\n",
      "cause": "Expected values to be strictly equal:\n\n2 !== 3\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n2 !== 3\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:81:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N01: daily digest bypasses an event email channel disabled before sending",
      "ms": 10186.9224,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(sent > 0)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(sent > 0)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(sent > 0)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-channels.integration.cjs:107:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-channels.integration.cjs",
      "name": "P7A-N02: branch-scoped WhatsApp contact write survives a transfer after authorization",
      "ms": 15034.8978,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- '966500009999'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- '966500009999'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- '966500009999'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-channels.integration.cjs:127:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_2d41db449454c660",
    "{\"case\":\"P7A-O04\",\"occupied\":10,\"statuses\":[200,200,200,200,200,200,200,200,200,200]}",
    "{\"case\":\"P7A-M01\",\"rejectsWrongShapeWithoutRepairingIt\":true}",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_00ad4a3d0634866d",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_788ac68afa11eee6",
    "Cleanup verified: hr_notify_channels_test_55f840891f048aee is absent from sys.databases.",
    "tests 13",
    "suites 0",
    "pass 2",
    "fail 11",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 58341.8865"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_2d41db449454c660\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_2d41db449454c660\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_00ad4a3d0634866d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_00ad4a3d0634866d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_788ac68afa11eee6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_788ac68afa11eee6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_55f840891f048aee\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_55f840891f048aee\"}\n"
  ]
}
