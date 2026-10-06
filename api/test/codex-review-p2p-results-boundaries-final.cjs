module.exports = {
  "selected": [
    "codex-review-p2p-boundaries"
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
    "duration_ms": 8544.3721
  },
  "results": [
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 5758.1321,
      "pass": false,
      "error": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "cause": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:21:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 316.0502,
      "pass": false,
      "error": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "cause": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P ordinary file owner remains allowed while an unbound upload is private to that account",
      "ms": 35.5533,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 5758.1321,
      "pass": false,
      "error": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "cause": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:21:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 316.0502,
      "pass": false,
      "error": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "cause": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"rebound-uploader-is-now-requester\",\"threadComments\":0,\"canInternal\":false,\"fileStatus\":200,\"fileBytesMatch\":true}",
    "{\"case\":\"foreign-link-after-account-rebinding\",\"detailStatus\":404,\"threadStatus\":404,\"foreignLinkRetained\":true}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8544.3721"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_boundaries_test_489e91d8ac3dca77\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_boundaries_test_489e91d8ac3dca77\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2p_boundaries_test_489e91d8ac3dca77\"}\n"
  ]
}
