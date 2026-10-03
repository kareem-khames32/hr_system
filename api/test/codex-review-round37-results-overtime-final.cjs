module.exports = {
  "selected": [
    "codex-review-round37-overtime"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 3,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 23753.015
  },
  "results": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 11353.8431,
      "pass": false,
      "error": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:329:139)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 4507.3738,
      "pass": false,
      "error": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:349:164)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4271.4546,
      "pass": false,
      "error": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "cause": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:366:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 11353.8431,
      "pass": false,
      "error": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:329:139)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 4507.3738,
      "pass": false,
      "error": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "cause": "{\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"انتهت صلاحية الجلسة — سجّل الدخول من جديد\",\"error\":\"Unauthorized\",\"statusCode\":401}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:349:164)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4271.4546,
      "pass": false,
      "error": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "cause": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:366:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"overtime-report-run-reference\",\"directRunStatus\":403,\"reportStatus\":200,\"branchRun\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":\"2026-08\",\"status\":\"PAID\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-08-31\"},\"branchDeferredFromRunId\":6,\"companyRun\":{\"id\":7,\"name\":\"مسير قبول مصادر الإضافي 6\",\"period\":\"2026-08\",\"status\":\"PAID\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-08-31\"},\"companyDeferredFromRunId\":6,\"amount\":126.56,\"storedHistoryUnchanged\":true}",
    "Cleanup verified: hr_codex_r37_ot_test_c2dac5a6857e84cb no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23753.015"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r37_ot_test_c2dac5a6857e84cb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r37_ot_test_c2dac5a6857e84cb\"}\n"
  ]
}
