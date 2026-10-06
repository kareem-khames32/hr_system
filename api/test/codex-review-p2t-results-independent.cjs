module.exports = {
  "selected": [
    "codex-review-p2t-independent",
    "codex-review-p2t-read-races"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 8,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 14454.8228
  },
  "results": [
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: initial draft submission must recheck current employee attributes",
      "ms": 4587.0584,
      "pass": false,
      "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
      "ms": 156.2482,
      "pass": false,
      "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "cause": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
      "ms": 56.4587,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: edit-only permission must not commit values then answer forbidden",
      "ms": 27.2823,
      "pass": false,
      "error": "A forbidden response must not follow a committed write",
      "cause": "A forbidden response must not follow a committed write",
      "stack": "AssertionError [ERR_ASSERTION]: A forbidden response must not follow a committed write\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:55:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save",
      "ms": 138.283,
      "pass": false,
      "error": "PATCH /users/4: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب acfee367-7e8e-411c-af0d-b6ffe4fa9faf@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /users/4: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب acfee367-7e8e-411c-af0d-b6ffe4fa9faf@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /users/4: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب acfee367-7e8e-411c-af0d-b6ffe4fa9faf@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:70:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
      "ms": 4414.4312,
      "pass": false,
      "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "cause": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: No point in time made the new value readable to this viewer\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
      "ms": 84.4016,
      "pass": false,
      "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "cause": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T post-write response must not pick up a foreign value after its scope check",
      "ms": 67.7888,
      "pass": false,
      "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "cause": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: initial draft submission must recheck current employee attributes",
      "ms": 4587.0584,
      "pass": false,
      "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
      "ms": 156.2482,
      "pass": false,
      "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "cause": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
      "ms": 56.4587,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T B: edit-only permission must not commit values then answer forbidden",
      "ms": 27.2823,
      "pass": false,
      "error": "A forbidden response must not follow a committed write",
      "cause": "A forbidden response must not follow a committed write",
      "stack": "AssertionError [ERR_ASSERTION]: A forbidden response must not follow a committed write\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:55:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-independent.integration.cjs",
      "name": "P2T controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save",
      "ms": 138.283,
      "pass": false,
      "error": "PATCH /users/4: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب acfee367-7e8e-411c-af0d-b6ffe4fa9faf@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /users/4: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب acfee367-7e8e-411c-af0d-b6ffe4fa9faf@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /users/4: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب acfee367-7e8e-411c-af0d-b6ffe4fa9faf@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:70:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
      "ms": 4414.4312,
      "pass": false,
      "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "cause": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: No point in time made the new value readable to this viewer\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
      "ms": 84.4016,
      "pass": false,
      "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "cause": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T post-write response must not pick up a foreign value after its scope check",
      "ms": 67.7888,
      "pass": false,
      "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "cause": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"attribute-draft-recheck\",\"freshCreate\":403,\"draftSubmit\":201,\"state\":\"UNDER_REVIEW\"}",
    "{\"case\":\"restricted-custom-draft\",\"freshCreate\":403,\"draftSubmit\":201,\"state\":\"UNDER_REVIEW\"}",
    "{\"case\":\"invalid-condition\",\"catalog\":true,\"submit\":201,\"nationalityMissing\":true}",
    "{\"case\":\"edit-only-save\",\"status\":403,\"stored\":\"committed despite error\"}",
    "{\"case\":\"restricted-after-definition-read\",\"status\":200,\"leaked\":true}",
    "{\"case\":\"branch-after-authorization\",\"status\":200,\"leaked\":true}",
    "{\"case\":\"postwrite-scope-race\",\"status\":200,\"leaked\":true}",
    "tests 8",
    "suites 0",
    "pass 0",
    "fail 8",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14454.8228"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_independent_test_f98fb66478eea337\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_independent_test_f98fb66478eea337\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_independent_test_f98fb66478eea337\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_read_races_test_961466ec1e733e16\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_read_races_test_961466ec1e733e16\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_read_races_test_961466ec1e733e16\"}\n"
  ]
}
