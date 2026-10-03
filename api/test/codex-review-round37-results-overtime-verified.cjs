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
    "duration_ms": 22729.2604
  },
  "results": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 10757.6313,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(Number.isFinite(Date.parse(hidden.createdAt)))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(Number.isFinite(Date.parse(hidden.createdAt)))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(Number.isFinite(Date.parse(hidden.createdAt)))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:336:58)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 4727.8222,
      "pass": false,
      "error": "Request event reason must conceal foreign payroll references\n\ntrue !== false\n",
      "cause": "Request event reason must conceal foreign payroll references\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Request event reason must conceal foreign payroll references\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:356:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4734.545,
      "pass": false,
      "error": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "cause": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:367:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 10757.6313,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(Number.isFinite(Date.parse(hidden.createdAt)))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(Number.isFinite(Date.parse(hidden.createdAt)))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(Number.isFinite(Date.parse(hidden.createdAt)))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:336:58)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 4727.8222,
      "pass": false,
      "error": "Request event reason must conceal foreign payroll references\n\ntrue !== false\n",
      "cause": "Request event reason must conceal foreign payroll references\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Request event reason must conceal foreign payroll references\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:356:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4734.545,
      "pass": false,
      "error": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "cause": "Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Payroll overtime report must conceal an entirely foreign payroll head\n+ actual - expected\n\n+ {\n+   endDate: '2026-08-31',\n+   id: null,\n+   name: 'مسير خارج نطاق صلاحيتك',\n+   period: '2026-08',\n+   startDate: '2026-08-01',\n+   status: 'PAID'\n+ }\n- null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:367:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"overtime-request-event-run-reference\",\"directRunStatus\":403,\"requestStatus\":200,\"originalRun\":4,\"reversalRun\":5,\"branchReason\":\"عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير\",\"companyReason\":\"عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير\",\"selfReason\":\"عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير\",\"amount\":126.56,\"status\":\"APPROVED\",\"storedHistoryUnchanged\":true}",
    "{\"case\":\"overtime-report-run-reference\",\"directRunStatus\":403,\"reportStatus\":200,\"branchRun\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":\"2026-08\",\"status\":\"PAID\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-08-31\"},\"branchDeferredFromRunId\":6,\"companyRun\":{\"id\":7,\"name\":\"مسير قبول مصادر الإضافي 6\",\"period\":\"2026-08\",\"status\":\"PAID\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-08-31\"},\"companyDeferredFromRunId\":6,\"amount\":126.56,\"storedHistoryUnchanged\":true}",
    "Cleanup verified: hr_codex_r37_ot_test_e39f75ba9080d12c no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22729.2604"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r37_ot_test_e39f75ba9080d12c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r37_ot_test_e39f75ba9080d12c\"}\n"
  ]
}
