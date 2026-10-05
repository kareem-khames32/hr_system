module.exports = {
  "selected": [
    "codex-review-p2a-independent"
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
    "duration_ms": 7771.8358
  },
  "results": [
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit and queue reject unauthenticated or out of scope viewers; allowed reads retain audit values",
      "ms": 4918.8265,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 91.8754,
      "pass": false,
      "error": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "cause": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 110.8337,
      "pass": false,
      "error": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "cause": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A concurrent repeated outbox keys and two workers produce one event and one job effect",
      "ms": 79.0686,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A a failed file hash update leaves neither a database row nor a new disk file",
      "ms": 58.8125,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 91.8754,
      "pass": false,
      "error": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "cause": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 110.8337,
      "pass": false,
      "error": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "cause": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"permission-audit-atomicity\",\"httpStatus\":500,\"grants\":[\"payroll.view\"],\"effectivePayrollView\":true,\"auditRows\":0}",
    "{\"case\":\"zip-comment-file-type\",\"status\":201,\"mime\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"storedRows\":1,\"containsOfficePart\":false,\"shaMatches\":true}",
    "tests 5",
    "suites 0",
    "pass 3",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7771.8358"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_independent_test_d7cb6ec9289748d0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_independent_test_d7cb6ec9289748d0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_independent_test_d7cb6ec9289748d0\"}\n"
  ]
}
