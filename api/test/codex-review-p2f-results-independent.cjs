module.exports = {
  "selected": [
    "codex-review-p2f-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 1,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 14418.971
  },
  "results": [
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F delivery lock spans SMTP across service instances and releases after failure without changing the request",
      "ms": 6369.3932,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F deferred digest is deduplicated, requeues when quiet hours extend, then is delivered once by the queue",
      "ms": 293.3845,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 1791180121000\n- 1791190921000\n       ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 1791180121000\n- 1791190921000\n       ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 1791180121000\n- 1791190921000\n       ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2f-independent.integration.cjs:74:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F self creator retains request read access after account relink but no longer receives the owners decision",
      "ms": 868.9274,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F making a request type confidential after distribution suppresses its prepared approver mail in both channels",
      "ms": 432.8116,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F deferred digest is deduplicated, requeues when quiet hours extend, then is delivered once by the queue",
      "ms": 293.3845,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 1791180121000\n- 1791190921000\n       ^\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 1791180121000\n- 1791190921000\n       ^\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ 1791180121000\n- 1791190921000\n       ^\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2f-independent.integration.cjs:74:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"lock-release-and-independent-instances\",\"whileSending\":0,\"afterFailure\":1,\"smtpCalls\":2,\"sent\":1,\"requestUnchanged\":true}",
    "{\"case\":\"creator-is-not-current-owner\",\"outcomes\":[{\"mode\":\"ON\",\"read\":200,\"delivery\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"read\":200,\"delivery\":\"SKIPPED\"}]}",
    "{\"case\":\"new-confidentiality\",\"outcomes\":[{\"mode\":\"ON\",\"sent\":0,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"sent\":0,\"status\":\"SKIPPED\"}]}",
    "tests 4",
    "suites 0",
    "pass 3",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14418.971"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2f_independent_test_4f4ee0a6f1a5b39b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2f_independent_test_4f4ee0a6f1a5b39b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2f_independent_test_4f4ee0a6f1a5b39b\"}\n"
  ]
}
