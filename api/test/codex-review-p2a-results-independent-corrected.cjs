module.exports = {
  "selected": [
    "codex-review-p2a-independent",
    "codex-review-p2a-money"
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
    "duration_ms": 9856.9383
  },
  "results": [
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit and queue reject unauthenticated or out of scope viewers; allowed reads retain audit values",
      "ms": 5198.3198,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 105.4657,
      "pass": false,
      "error": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "cause": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 128.5862,
      "pass": false,
      "error": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "cause": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A concurrent repeated outbox keys and two workers produce one event and one job effect",
      "ms": 91.7227,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-money.integration.cjs",
      "name": "P2A payroll outbox and audit failure roll back actual approval; all four money scenarios equal committed phase 1",
      "ms": 6849.0382,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 105.4657,
      "pass": false,
      "error": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "cause": "A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A failed audited grant must roll back permissions with its audit row\n+ actual - expected\n\n+ [\n+   'payroll.view'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2a-independent.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 128.5862,
      "pass": false,
      "error": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "cause": "Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-independent.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"permission-audit-atomicity\",\"httpStatus\":500,\"grants\":[\"payroll.view\"],\"effectivePayrollView\":true,\"auditRows\":0}",
    "{\"case\":\"zip-comment-file-type\",\"status\":201,\"mime\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"storedRows\":1,\"containsOfficePart\":false,\"shaMatches\":true}",
    "{\"case\":\"P2A-money\",\"totalNet\":34236.56,\"net\":[7455.56,18163,1703,6915],\"allDecimalColumnsEqualPhase1\":true,\"controls\":[{\"failedTable\":\"outbox_events\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true},{\"failedTable\":\"audit_log\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true}]}",
    "tests 5",
    "suites 0",
    "pass 3",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9856.9383"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_independent_test_f531f76a1556df45\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_independent_test_f531f76a1556df45\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_independent_test_f531f76a1556df45\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_money_test_ba78d7cc28f9a6f1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_money_test_ba78d7cc28f9a6f1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_money_test_ba78d7cc28f9a6f1\"}\n"
  ]
}
