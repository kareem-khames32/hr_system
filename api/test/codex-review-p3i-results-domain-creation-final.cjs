module.exports = {
  "selected": [
    "codex-review-p3i-domain-creation"
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
    "duration_ms": 7552.4946
  },
  "results": [
    {
      "file": "codex-review-p3i-domain-creation.integration.cjs",
      "name": "P3I-D-sequential: the established GUID prevents a second directory identity from claiming the same employee",
      "ms": 4579.4711,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-domain-creation.integration.cjs",
      "name": "P3I-D-create-same-guid: two simultaneous first domain logins do not create duplicate employee accounts",
      "ms": 162.9687,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-domain-creation.integration.cjs",
      "name": "P3I-D-create-two-guids: two simultaneous first domain logins do not create duplicate employee accounts",
      "ms": 163.3305,
      "pass": false,
      "error": "only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n",
      "cause": "only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-domain-creation.integration.cjs:25:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3i-domain-creation.integration.cjs",
      "name": "P3I-D-created-account: an existing disabled account appearing after matching is not bypassed by a stale first-login creation",
      "ms": 243.6383,
      "pass": false,
      "error": "stale creation must not create a second active identity that bypasses the current disabled-account refusal",
      "cause": "stale creation must not create a second active identity that bypasses the current disabled-account refusal",
      "stack": "AssertionError [ERR_ASSERTION]: stale creation must not create a second active identity that bypasses the current disabled-account refusal\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-domain-creation.integration.cjs:39:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3i-domain-creation.integration.cjs",
      "name": "P3I-D-create-two-guids: two simultaneous first domain logins do not create duplicate employee accounts",
      "ms": 163.3305,
      "pass": false,
      "error": "only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n",
      "cause": "only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-domain-creation.integration.cjs:25:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3i-domain-creation.integration.cjs",
      "name": "P3I-D-created-account: an existing disabled account appearing after matching is not bypassed by a stale first-login creation",
      "ms": 243.6383,
      "pass": false,
      "error": "stale creation must not create a second active identity that bypasses the current disabled-account refusal",
      "cause": "stale creation must not create a second active identity that bypasses the current disabled-account refusal",
      "stack": "AssertionError [ERR_ASSERTION]: stale creation must not create a second active identity that bypasses the current disabled-account refusal\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-domain-creation.integration.cjs:39:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7552.4946"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_domain_creation_test_ff7d45294ad24605\"}\n",
    "REVIEW_MEASURE {\"case\":\"sequential-domain-control\",\"statuses\":[201,401],\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"concurrent-domain-creation\",\"sameGuid\":true,\"statuses\":[500,201],\"accounts\":1,\"protectedSessions\":1}\n",
    "REVIEW_MEASURE {\"case\":\"concurrent-domain-creation\",\"sameGuid\":false,\"statuses\":[201,201],\"accounts\":2,\"protectedSessions\":2}\n",
    "REVIEW_MEASURE {\"case\":\"domain-creation-after-disabled-account\",\"freshLogin\":401,\"pendingLogin\":201,\"accounts\":2,\"protectedAccess\":200,\"employeeMatches\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_domain_creation_test_ff7d45294ad24605\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_domain_creation_test_ff7d45294ad24605\"}\n"
  ]
}
