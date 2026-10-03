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
    "duration_ms": 31140.8698
  },
  "results": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 16533.0999,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async transferAndRestrict (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:311:2)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:327:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 5116.7083,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async transferAndRestrict (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:311:2)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:347:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4350.1185,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async transferAndRestrict (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:311:2)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:357:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 16533.0999,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async transferAndRestrict (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:311:2)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:327:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 5116.7083,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async transferAndRestrict (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:311:2)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:347:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4350.1185,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at expectOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:293:27)\n    at requestOK (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:294:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async transferAndRestrict (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:311:2)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round37-overtime.integration.cjs:357:38)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_codex_r37_ot_test_17c48fec66624d83 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 31140.8698"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r37_ot_test_17c48fec66624d83\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r37_ot_test_17c48fec66624d83\"}\n"
  ]
}
