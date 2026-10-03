module.exports = {
  "selected": [
    "codex-review-round40-key-boundary"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 2,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 8428.7557
  },
  "results": [
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history",
      "ms": 5942.2895,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 35.2102,
      "pass": false,
      "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "cause": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:67:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 41.9544,
      "pass": false,
      "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "cause": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:67:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 35.2102,
      "pass": false,
      "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "cause": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:67:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 41.9544,
      "pass": false,
      "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "cause": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:67:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"line-key-rendering-controls\",\"hiddenKeys\":[\"BASIC\",\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~d1124846\"],\"rowColumnMapping\":true,\"stableReads\":true,\"net\":9067.89,\"companySelfPreserved\":true,\"storedUnchanged\":true}",
    "{\"case\":\"recover-hidden-period-from-key\",\"route\":\"payslip\",\"directForeignRead\":403,\"currentRead\":200,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~d1124846\",\"readerOnlyCandidateSpace\":432,\"decoded\":[\"2026-07\"],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"recover-hidden-period-from-key\",\"route\":\"run-lines\",\"directForeignRead\":403,\"currentRead\":200,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~d1124846\",\"readerOnlyCandidateSpace\":432,\"decoded\":[\"2026-07\"],\"net\":9067.89,\"storedUnchanged\":true}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8428.7557"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_payslip_test_bd4cc7fb33da31dd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_payslip_test_bd4cc7fb33da31dd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_payslip_test_bd4cc7fb33da31dd\"}\n"
  ]
}
