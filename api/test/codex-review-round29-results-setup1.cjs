module.exports = {
  "selected": [
    "codex-review-round29-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 10,
      "failed": 10,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 7106.0912
  },
  "results": [
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 3864.1692,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:25:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 73.8834,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 76.1209,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 68.7795,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 71.6176,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:25:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 69.6742,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 71.7053,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 69.7721,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 early loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 314.9509,
      "pass": false,
      "error": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:91:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 defer loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 212.8303,
      "pass": false,
      "error": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:91:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 3864.1692,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:25:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 73.8834,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 76.1209,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 68.7795,
      "pass": false,
      "error": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /bonuses/types: 400 {\"code\":\"BONUS_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 71.6176,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:25:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 69.6742,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 71.7053,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 69.7721,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "cause": "POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"code\":\"DEDUCTION_TYPE_INVALID\",\"message\":\"الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async proposed (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:18:13)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:40:26)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 early loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 314.9509,
      "pass": false,
      "error": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:91:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 defer loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 212.8303,
      "pass": false,
      "error": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests: 401 {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-independent.integration.cjs:91:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 10",
    "suites 0",
    "pass 0",
    "fail 10",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7106.0912"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r29_independent_test_04ce36dcf762164f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r29_independent_test_04ce36dcf762164f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r29_independent_test_04ce36dcf762164f\"}\n"
  ]
}
