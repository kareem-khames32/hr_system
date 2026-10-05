module.exports = {
  "selected": [
    "codex-review-p2a-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 6592.7
  },
  "results": [
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit and queue reject unauthenticated or out of scope viewers; allowed reads retain audit values",
      "ms": 4092.1368,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 23.8701,
      "pass": false,
      "error": "audit failure reached the public operation\n\n404 !== 500\n",
      "cause": "audit failure reached the public operation\n\n404 !== 500\n",
      "stack": "AssertionError [ERR_ASSERTION]: audit failure reached the public operation\n\n404 !== 500\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:29:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 85.1697,
      "pass": false,
      "error": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "cause": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A concurrent repeated outbox keys and two workers produce one event and one job effect",
      "ms": 69.9558,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 23.8701,
      "pass": false,
      "error": "audit failure reached the public operation\n\n404 !== 500\n",
      "cause": "audit failure reached the public operation\n\n404 !== 500\n",
      "stack": "AssertionError [ERR_ASSERTION]: audit failure reached the public operation\n\n404 !== 500\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:29:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 85.1697,
      "pass": false,
      "error": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "cause": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"zip-comment-file-type\",\"status\":201,\"mime\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"storedRows\":1,\"containsOfficePart\":false,\"shaMatches\":true}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6592.7"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_independent_test_8dba51cb6593ad35\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_independent_test_8dba51cb6593ad35\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_independent_test_8dba51cb6593ad35\"}\n"
  ]
}
