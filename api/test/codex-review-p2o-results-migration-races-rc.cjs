module.exports = {
  "selected": [
    "codex-review-p2o-migration-races",
    "codex-review-p2o-readiness"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 1,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 13804.0996
  },
  "results": [
    {
      "file": "codex-review-p2o-migration-races.integration.cjs",
      "name": "P2O migration during a blocked task mutation: fresh link checks under RC and RCSI",
      "ms": 8898.727,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2o-migration-races.integration.cjs:52:11)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: auditTableReady",
      "ms": 18.7972,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: queueTablesReady",
      "ms": 0.44,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: notificationTablesReady",
      "ms": 6.6092,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: tasksTableReady",
      "ms": 0.6942,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: executionSchemaReady",
      "ms": 0.5373,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: delegationSchemaReady",
      "ms": 0.4004,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: policySchemaReady",
      "ms": 6.346,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: documentAckSchemaReady",
      "ms": 15.4526,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2o-migration-races.integration.cjs",
      "name": "P2O migration during a blocked task mutation: fresh link checks under RC and RCSI",
      "ms": 8898.727,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2o-migration-races.integration.cjs:52:11)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 9",
    "suites 0",
    "pass 8",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13804.0996"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_migrate_race_test_d040f0d608d05d5c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_migrate_race_test_d040f0d608d05d5c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_migrate_race_test_d040f0d608d05d5c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n"
  ]
}
