module.exports = {
  "selected": [
    "codex-review-round39-payslip"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 2,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 9343.1501
  },
  "results": [
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact",
      "ms": 6686.0486,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
      "ms": 63.1153,
      "pass": false,
      "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:49:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
      "ms": 53.9493,
      "pass": false,
      "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:49:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-detail: no foreign payroll period through a current in-scope payroll",
      "ms": 63.5391,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 events: no foreign payroll period through a current in-scope payroll",
      "ms": 39.4124,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
      "ms": 63.1153,
      "pass": false,
      "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:49:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
      "ms": 53.9493,
      "pass": false,
      "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:49:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"real-restored-ledger-controls\",\"foreignRunRead\":403,\"currentRunRead\":200,\"ledgerLabel\":\"إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance\",\"obligationDetailLabel\":\"إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance\",\"companyLabel\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\",\"net\":9067.89,\"restoredAmount\":67.89,\"companyAndSelfPreserved\":true,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"payslip\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[{\"path\":\"$.lines.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.lines.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"}],\"companyRefs\":[{\"path\":\"$.obligationDetails[0].label\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.lines.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.lines.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"run-lines\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[{\"path\":\"$.columns.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.columns.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.rows[0].earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.rows[0].earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"}],\"companyRefs\":[{\"path\":\"$.columns.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.columns.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.rows[0].earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.rows[0].earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"run-detail\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[],\"companyRefs\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"events\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[],\"companyRefs\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "tests 5",
    "suites 0",
    "pass 3",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9343.1501"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_payslip_test_b6b5b41f07a8cfac\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_payslip_test_b6b5b41f07a8cfac\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_payslip_test_b6b5b41f07a8cfac\"}\n"
  ]
}
