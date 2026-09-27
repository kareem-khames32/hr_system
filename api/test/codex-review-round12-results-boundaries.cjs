module.exports = {
  "selected": [
    "codex-review-round12-boundaries"
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
    "duration_ms": 9136.8722
  },
  "results": [
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 missing foreign executive manager must not disclose its stored name in a submission error",
      "ms": 5846.9249,
      "pass": false,
      "error": "A branch B requester must not learn the stored name of a hidden administration in A through validation",
      "cause": "A branch B requester must not learn the stored name of a hidden administration in A through validation",
      "stack": "AssertionError [ERR_ASSERTION]: A branch B requester must not learn the stored name of a hidden administration in A through validation\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round12-boundaries.integration.cjs:27:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 reason catalog must not reveal usage by offboarding cases outside the readers branch",
      "ms": 289.7862,
      "pass": false,
      "error": "A hidden branch A case must not change the branch B catalog usage count\n\n1 !== 0\n",
      "cause": "A hidden branch A case must not change the branch B catalog usage count\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: A hidden branch A case must not change the branch B catalog usage count\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round12-boundaries.integration.cjs:41:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 cross-branch administration approver needs the request branch in scope; authorization remains intact",
      "ms": 240.8283,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 moving a requester out of scope hides administrationName as well as the other current organization fields",
      "ms": 84.3058,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 missing foreign executive manager must not disclose its stored name in a submission error",
      "ms": 5846.9249,
      "pass": false,
      "error": "A branch B requester must not learn the stored name of a hidden administration in A through validation",
      "cause": "A branch B requester must not learn the stored name of a hidden administration in A through validation",
      "stack": "AssertionError [ERR_ASSERTION]: A branch B requester must not learn the stored name of a hidden administration in A through validation\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round12-boundaries.integration.cjs:27:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 reason catalog must not reveal usage by offboarding cases outside the readers branch",
      "ms": 289.7862,
      "pass": false,
      "error": "A hidden branch A case must not change the branch B catalog usage count\n\n1 !== 0\n",
      "cause": "A hidden branch A case must not change the branch B catalog usage count\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: A hidden branch A case must not change the branch B catalog usage count\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round12-boundaries.integration.cjs:41:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 9136.8722"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r12boundaries_test_f344b0b2aeb1a6b1\"}\n",
    "CR12_EVIDENCE {\"case\":\"foreign-administration-error\",\"listHidesName\":true,\"status\":400,\"error\":{\"message\":\"الإدارة «CR12_PRIVATE_EXECUTIVE_A» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":true}\n",
    "CR12_EVIDENCE {\"case\":\"foreign-case-usage\",\"before\":0,\"after\":1,\"visibleCases\":0,\"foreignDetail\":404,\"canEdit\":false}\n",
    "CR12_EVIDENCE {\"case\":\"cross-branch-approver\",\"submissionStatus\":\"UNDER_REVIEW\",\"limitedApproverBlocked\":true,\"cardUsesGenericName\":true,\"companyScopeFinalStatus\":\"COMPLETED\"}\n",
    "CR12_EVIDENCE {\"case\":\"transferred-requester-card\",\"orgHidden\":true,\"allOrganizationFieldsNull\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r12boundaries_test_f344b0b2aeb1a6b1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r12boundaries_test_f344b0b2aeb1a6b1\"}\n"
  ]
}
