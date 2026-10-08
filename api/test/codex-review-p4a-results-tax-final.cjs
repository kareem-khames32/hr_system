module.exports = {
  "selected": [
    "codex-review-p4a-tax"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 12810.9625
  },
  "results": [
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F01: API activation accepts a verified successor but payroll deducts with its unverified predecessor",
      "ms": 9462.9451,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F03: alternative calculated draft contaminates tax of the run that is ultimately approved",
      "ms": 567.2348,
      "pass": false,
      "error": "{\"code\":\"PAYRUN-DRAFT-CONFLICT\",\"message\":\"توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب\",\"conflicts\":[{\"employeeId\":4,\"otherRunId\":3,\"name\":\"P4A alternative one\",\"status\":\"CALCULATED\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-09-30\",\"overlapDays\":30,\"blocking\":false,\"kind\":\"EXACT\"}]}\n\n409 !== 201\n",
      "cause": "{\"code\":\"PAYRUN-DRAFT-CONFLICT\",\"message\":\"توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب\",\"conflicts\":[{\"employeeId\":4,\"otherRunId\":3,\"name\":\"P4A alternative one\",\"status\":\"CALCULATED\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-09-30\",\"overlapDays\":30,\"blocking\":false,\"kind\":\"EXACT\"}]}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"code\":\"PAYRUN-DRAFT-CONFLICT\",\"message\":\"توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب\",\"conflicts\":[{\"employeeId\":4,\"otherRunId\":3,\"name\":\"P4A alternative one\",\"status\":\"CALCULATED\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-09-30\",\"overlapDays\":30,\"blocking\":false,\"kind\":\"EXACT\"}]}\n\n409 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tax.integration.cjs:41:53)\n    at runFor (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tax.integration.cjs:52:51)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tax.integration.cjs:131:73)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F03: alternative calculated draft contaminates tax of the run that is ultimately approved",
      "ms": 567.2348,
      "pass": false,
      "error": "{\"code\":\"PAYRUN-DRAFT-CONFLICT\",\"message\":\"توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب\",\"conflicts\":[{\"employeeId\":4,\"otherRunId\":3,\"name\":\"P4A alternative one\",\"status\":\"CALCULATED\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-09-30\",\"overlapDays\":30,\"blocking\":false,\"kind\":\"EXACT\"}]}\n\n409 !== 201\n",
      "cause": "{\"code\":\"PAYRUN-DRAFT-CONFLICT\",\"message\":\"توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب\",\"conflicts\":[{\"employeeId\":4,\"otherRunId\":3,\"name\":\"P4A alternative one\",\"status\":\"CALCULATED\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-09-30\",\"overlapDays\":30,\"blocking\":false,\"kind\":\"EXACT\"}]}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"code\":\"PAYRUN-DRAFT-CONFLICT\",\"message\":\"توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب\",\"conflicts\":[{\"employeeId\":4,\"otherRunId\":3,\"name\":\"P4A alternative one\",\"status\":\"CALCULATED\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-09-30\",\"overlapDays\":30,\"blocking\":false,\"kind\":\"EXACT\"}]}\n\n409 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tax.integration.cjs:41:53)\n    at runFor (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tax.integration.cjs:52:51)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tax.integration.cjs:131:73)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"oldVerified\":false,\"tableVerified\":false,\"tax\":1482.5,\"net\":11867.5,\"approved\":true}",
    "Cleanup verified: hr_payroll_statutory_test_c56287621df1179a is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12810.9625"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_c56287621df1179a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_c56287621df1179a\"}\n"
  ]
}
