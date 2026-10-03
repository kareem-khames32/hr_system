module.exports = {
  "selected": [
    "codex-review-round40-key-boundary"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 2,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 12093.4274
  },
  "results": [
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
      "ms": 8973.6123,
      "pass": false,
      "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:76:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
      "ms": 83.1672,
      "pass": false,
      "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:76:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
      "ms": 8973.6123,
      "pass": false,
      "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:76:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
      "ms": 83.1672,
      "pass": false,
      "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:76:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"adjacent-reader-foreign-period\",\"route\":\"overview-lines\",\"url\":\"/payroll/overview/lines?period=2026-11\",\"foreignRead\":403,\"currentRead\":200,\"leaks\":[{\"path\":\"$.columns.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.columns.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"companyRefs\":[{\"path\":\"$.columns.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.columns.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"adjacent-reader-foreign-period\",\"route\":\"approval-review\",\"url\":\"/payroll/approval-chain/runs/3/review\",\"foreignRead\":403,\"currentRead\":200,\"leaks\":[{\"path\":\"$.rows[0].earningLines[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earningLines[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"companyRefs\":[{\"path\":\"$.rows[0].earningLines[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earningLines[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12093.4274"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_payslip_test_392eadc349ac93db\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_payslip_test_392eadc349ac93db\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_payslip_test_392eadc349ac93db\"}\n"
  ]
}
