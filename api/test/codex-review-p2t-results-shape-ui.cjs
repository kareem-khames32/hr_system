module.exports = {
  "selected": [
    "codex-review-p2t-migration-shape",
    "codex-review-p2t-auditor-units"
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
    "duration_ms": 2394.2891
  },
  "results": [
    {
      "file": "codex-review-p2t-auditor-units.integration.cjs",
      "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
      "ms": 4.1403,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:12:84)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)"
    },
    {
      "file": "codex-review-p2t-auditor-units.integration.cjs",
      "name": "P2T constructor is a valid field key and must not crash the actual audience-editor JSX",
      "ms": 16.545,
      "pass": false,
      "error": "Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"",
      "cause": "Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"",
      "stack": "AssertionError [ERR_ASSERTION]: Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:24:9)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n    at Test.postRun (node:internal/test_runner/test:1235:19)\n    at Test.run (node:internal/test_runner/test:1163:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2t-auditor-units.integration.cjs",
      "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
      "ms": 4.1403,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:12:84)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)"
    },
    {
      "file": "codex-review-p2t-auditor-units.integration.cjs",
      "name": "P2T constructor is a valid field key and must not crash the actual audience-editor JSX",
      "ms": 16.545,
      "pass": false,
      "error": "Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"",
      "cause": "Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"",
      "stack": "AssertionError [ERR_ASSERTION]: Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:24:9)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n    at Test.postRun (node:internal/test_runner/test:1235:19)\n    at Test.run (node:internal/test_runner/test:1163:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"malformed-runtime-conditions\",\"actual\":[true,true,true,true]}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 2394.2891"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
