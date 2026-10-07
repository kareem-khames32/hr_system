module.exports = {
  "selected": [
    "codex-review-p3d-documents"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 9312.4995
  },
  "results": [
    {
      "file": "codex-review-p3d-documents.integration.cjs",
      "name": "P3D-E01: simultaneous expiry scans create one event and one renewal task",
      "ms": 6241.4271,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3d-documents.integration.cjs",
      "name": "P3D-E02: queued document email is suppressed after recipient account is rebound",
      "ms": 230.0622,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3d-documents.integration.cjs",
      "name": "P3D-E03: a queued alert must be suppressed when a replacement document already supersedes it",
      "ms": 181.3508,
      "pass": false,
      "error": "a replaced document must not send its old expiry alert\n\n1 !== 0\n",
      "cause": "a replaced document must not send its old expiry alert\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: a replaced document must not send its old expiry alert\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-documents.integration.cjs:41:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3d-documents.integration.cjs",
      "name": "P3D-E03: a queued alert must be suppressed when a replacement document already supersedes it",
      "ms": 181.3508,
      "pass": false,
      "error": "a replaced document must not send its old expiry alert\n\n1 !== 0\n",
      "cause": "a replaced document must not send its old expiry alert\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: a replaced document must not send its old expiry alert\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-documents.integration.cjs:41:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9312.4995"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3d_docs_test_f1ae01fbf6caaaee\"}\n",
    "REVIEW_MEASURE {\"case\":\"superseded-document-email\",\"reportHidesOldDocument\":true,\"mails\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3d_docs_test_f1ae01fbf6caaaee\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3d_docs_test_f1ae01fbf6caaaee\"}\n"
  ]
}
