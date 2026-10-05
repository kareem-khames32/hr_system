module.exports = {
  "selected": [
    "codex-review-p2d-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 7,
      "failed": 6,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 7070.0097
  },
  "results": [
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D independent regular OLE chains: 512/4096 sectors, physical permutation, exact last byte",
      "ms": 4326.9816,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'doc' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:50:36)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D mini streams: chained data crosses root sectors, later link loss is refused",
      "ms": 1.3582,
      "pass": false,
      "error": "mini chain cut at 65\n\n'doc' !== null\n",
      "cause": "mini chain cut at 65\n\n'doc' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: mini chain cut at 65\n\n'doc' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:71:14)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D declared classification limit: root signature required; remaining body is not a document validator",
      "ms": 0.3902,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'doc' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:84:12)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D XML metadata: namespace aliases and character references cannot hide duplicate definitions",
      "ms": 1.4283,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'docx' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:102:12)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D OOXML main type is relationship plus namespace, independent of path and compression",
      "ms": 0.9981,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'docx' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:120:12)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D ZIP missing main bytes and encrypted main parts cannot upload as Office",
      "ms": 0.9269,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'docx' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:133:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D actual upload boundary: rejected containers create no row; accepted bytes/hash are unchanged",
      "ms": 82.8935,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D independent regular OLE chains: 512/4096 sectors, physical permutation, exact last byte",
      "ms": 4326.9816,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'doc' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:50:36)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D mini streams: chained data crosses root sectors, later link loss is refused",
      "ms": 1.3582,
      "pass": false,
      "error": "mini chain cut at 65\n\n'doc' !== null\n",
      "cause": "mini chain cut at 65\n\n'doc' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: mini chain cut at 65\n\n'doc' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:71:14)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D declared classification limit: root signature required; remaining body is not a document validator",
      "ms": 0.3902,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'doc' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'doc' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:84:12)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D XML metadata: namespace aliases and character references cannot hide duplicate definitions",
      "ms": 1.4283,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'docx' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:102:12)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D OOXML main type is relationship plus namespace, independent of path and compression",
      "ms": 0.9981,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'docx' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:120:12)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D ZIP missing main bytes and encrypted main parts cannot upload as Office",
      "ms": 0.9269,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "cause": "Expected values to be strictly equal:\n\n'docx' !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'docx' !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2d-independent.integration.cjs:133:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"independent-http-boundary\",\"rejected\":400,\"accepted\":201,\"hashUnchanged\":true,\"noRejectedRow\":true}",
    "tests 7",
    "suites 0",
    "pass 1",
    "fail 6",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7070.0097"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"523c50d\",\"sourceFiles\":471}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2d_independent_test_b412aca24ad00b7a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2d_independent_test_b412aca24ad00b7a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2d_independent_test_b412aca24ad00b7a\"}\n"
  ]
}
