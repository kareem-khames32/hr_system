module.exports = {
  "selected": [
    "codex-review-p2k-audit-boundaries"
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
    "duration_ms": 10679.7954
  },
  "results": [
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K recorded party actor remains concealed after real unlink, relink and disable; mixed actor filters preserve unrelated events",
      "ms": 7466.0297,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K current visible names including SQL wildcard characters drive exact counts and pages without revealing renamed foreign parties",
      "ms": 237.6538,
      "pass": false,
      "error": "PATCH /employees/6: 400 {\"message\":\"الاسم الكامل لازم يكون بالعربي\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "PATCH /employees/6: 400 {\"message\":\"الاسم الكامل لازم يكون بالعربي\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/6: 400 {\"message\":\"الاسم الكامل لازم يكون بالعربي\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-audit-boundaries.integration.cjs:61:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K actor linked to a hidden party only after the event is concealed while an unrelated officer and prototype-named entity remain readable",
      "ms": 301.9744,
      "pass": false,
      "error": "PATCH /users/14: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب k3-principal@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /users/14: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب k3-principal@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /users/14: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب k3-principal@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-audit-boundaries.integration.cjs:89:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K current visible names including SQL wildcard characters drive exact counts and pages without revealing renamed foreign parties",
      "ms": 237.6538,
      "pass": false,
      "error": "PATCH /employees/6: 400 {\"message\":\"الاسم الكامل لازم يكون بالعربي\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "PATCH /employees/6: 400 {\"message\":\"الاسم الكامل لازم يكون بالعربي\",\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/6: 400 {\"message\":\"الاسم الكامل لازم يكون بالعربي\",\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-audit-boundaries.integration.cjs:61:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K actor linked to a hidden party only after the event is concealed while an unrelated officer and prototype-named entity remain readable",
      "ms": 301.9744,
      "pass": false,
      "error": "PATCH /users/14: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب k3-principal@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /users/14: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب k3-principal@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /users/14: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب k3-principal@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2k-audit-boundaries.integration.cjs:89:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"recorded-actor-transition-matrix\",\"realUnlink\":true,\"realRelink\":true,\"disabled\":true,\"hiddenActorRows\":2,\"filteredCount\":0,\"unrelatedActorRows\":1,\"storageUnchanged\":true,\"allBranchesUnchanged\":true}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10679.7954"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2k_audit_test_0f2a3d3e50533cdc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2k_audit_test_0f2a3d3e50533cdc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2k_audit_test_0f2a3d3e50533cdc\"}\n"
  ]
}
