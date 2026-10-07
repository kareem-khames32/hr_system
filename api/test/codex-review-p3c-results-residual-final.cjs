module.exports = {
  "selected": [
    "codex-review-p3c-residual"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 3,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 14402.824
  },
  "results": [
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R01: approval waiting on manual creation must extend that frozen position, not create an active duplicate",
      "ms": 10000.6234,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3c-residual.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R02: frozen position committed before approval is extended without becoming active",
      "ms": 316.1064,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R03: generation must still match the current title name to employee titles after waiting",
      "ms": 223.2617,
      "pass": false,
      "error": "an old name no longer maps to this catalog title\n\n1 !== 0\n",
      "cause": "an old name no longer maps to this catalog title\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: an old name no longer maps to this catalog title\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3c-residual.integration.cjs:53:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R04: same-branch team move rejects linking and should suppress the now-invalid candidates",
      "ms": 272.717,
      "pass": false,
      "error": "the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n",
      "cause": "the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3c-residual.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R05: holder assignment and approval serialize on position before department without a cycle",
      "ms": 446.7787,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R06: catalog rename before the generation plan leaves old-title employees unlinked",
      "ms": 186.3175,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R01: approval waiting on manual creation must extend that frozen position, not create an active duplicate",
      "ms": 10000.6234,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3c-residual.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R03: generation must still match the current title name to employee titles after waiting",
      "ms": 223.2617,
      "pass": false,
      "error": "an old name no longer maps to this catalog title\n\n1 !== 0\n",
      "cause": "an old name no longer maps to this catalog title\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: an old name no longer maps to this catalog title\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3c-residual.integration.cjs:53:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3c-residual.integration.cjs",
      "name": "P3C-R04: same-branch team move rejects linking and should suppress the now-invalid candidates",
      "ms": 272.717,
      "pass": false,
      "error": "the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n",
      "cause": "the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3c-residual.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 6",
    "suites 0",
    "pass 3",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14402.824"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_residual_test_5f19ac789c401377\"}\n",
    "REVIEW_MEASURE {\"case\":\"approval-after-manual-insert\",\"manual\":1,\"approval\":201,\"positions\":[{\"id\":1,\"status\":\"FROZEN\",\"headcount\":3},{\"id\":2,\"status\":\"ACTIVE\",\"headcount\":2}]}\n",
    "REVIEW_MEASURE {\"case\":\"generation-title-renamed\",\"employeeTitle\":\"Synthetic title before rename\",\"currentTitle\":\"Synthetic renamed different title\",\"positions\":[5],\"link\":5}\n",
    "REVIEW_MEASURE {\"case\":\"same-branch-team-move\",\"unitHidden\":false,\"candidates\":[5],\"linkStatus\":400}\n",
    "REVIEW_MEASURE {\"case\":\"link-approval-lock-order\",\"statuses\":[201,201]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_residual_test_5f19ac789c401377\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3c_residual_test_5f19ac789c401377\"}\n"
  ]
}
