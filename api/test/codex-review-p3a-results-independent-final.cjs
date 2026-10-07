module.exports = {
  "selected": [
    "codex-review-p3a-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 4,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 12882.2679
  },
  "results": [
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I01: a moved department and team must not expose their foreign identifiers",
      "ms": 5129.4008,
      "pass": false,
      "error": "foreign department ID must be redacted along with its name",
      "cause": "foreign department ID must be redacted along with its name",
      "stack": "AssertionError [ERR_ASSERTION]: foreign department ID must be redacted along with its name\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:18:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I02: moving a team alone to a foreign department must hide its current name",
      "ms": 96.0174,
      "pass": false,
      "error": "team current department is outside the reader branch",
      "cause": "team current department is outside the reader branch",
      "stack": "AssertionError [ERR_ASSERTION]: team current department is outside the reader branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I03: department validity must survive waiting for the position creation lock",
      "ms": 228.6736,
      "pass": false,
      "error": "approval must reject a department moved out of the request branch while waiting\n\n201 !== 400\n",
      "cause": "approval must reject a department moved out of the request branch while waiting\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: approval must reject a department moved out of the request branch while waiting\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I04: generation must not overwrite a holder assignment committed after its initial plan",
      "ms": 106.9481,
      "pass": false,
      "error": "employee already seated in its unit must be skipped after acquiring its row lock\n\n6 !== 4\n",
      "cause": "employee already seated in its unit must be skipped after acquiring its row lock\n\n6 !== 4\n",
      "stack": "AssertionError [ERR_ASSERTION]: employee already seated in its unit must be skipped after acquiring its row lock\n\n6 !== 4\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:71:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I01: a moved department and team must not expose their foreign identifiers",
      "ms": 5129.4008,
      "pass": false,
      "error": "foreign department ID must be redacted along with its name",
      "cause": "foreign department ID must be redacted along with its name",
      "stack": "AssertionError [ERR_ASSERTION]: foreign department ID must be redacted along with its name\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:18:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I02: moving a team alone to a foreign department must hide its current name",
      "ms": 96.0174,
      "pass": false,
      "error": "team current department is outside the reader branch",
      "cause": "team current department is outside the reader branch",
      "stack": "AssertionError [ERR_ASSERTION]: team current department is outside the reader branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I03: department validity must survive waiting for the position creation lock",
      "ms": 228.6736,
      "pass": false,
      "error": "approval must reject a department moved out of the request branch while waiting\n\n201 !== 400\n",
      "cause": "approval must reject a department moved out of the request branch while waiting\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: approval must reject a department moved out of the request branch while waiting\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I04: generation must not overwrite a holder assignment committed after its initial plan",
      "ms": 106.9481,
      "pass": false,
      "error": "employee already seated in its unit must be skipped after acquiring its row lock\n\n6 !== 4\n",
      "cause": "employee already seated in its unit must be skipped after acquiring its row lock\n\n6 !== 4\n",
      "stack": "AssertionError [ERR_ASSERTION]: employee already seated in its unit must be skipped after acquiring its row lock\n\n6 !== 4\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:71:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 0",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12882.2679"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_independent_test_1fba0f49ff98c5e7\"}\n",
    "REVIEW_MEASURE {\"case\":\"foreign-department-reference\",\"actual\":{\"detail\":[1,1,\"قسم برّه الفرع\",null],\"list\":{\"id\":1,\"code\":\"P-0001\",\"jobTitleId\":1,\"title\":\"Synthetic analyst\",\"gradeId\":null,\"gradeName\":null,\"branchId\":1,\"branchName\":\"Synthetic branch A\",\"departmentId\":1,\"departmentName\":\"قسم برّه الفرع\",\"teamId\":1,\"teamName\":null,\"costCenterId\":null,\"costCenterName\":null,\"headcount\":3,\"status\":\"ACTIVE\",\"statusLabel\":\"نشطة\",\"budget\":null,\"approved\":3,\"occupied\":0,\"vacant\":3,\"over\":0,\"createdAt\":\"2026-10-07T07:02:04.472Z\"},\"option\":{\"id\":1,\"code\":\"P-0001\",\"title\":\"Synthetic analyst\",\"gradeName\":null,\"departmentId\":1,\"departmentName\":\"قسم برّه الفرع\",\"teamId\":1,\"teamName\":null,\"headcount\":3,\"occupied\":0,\"vacant\":3},\"preview\":[{\"branchId\":1,\"branchName\":\"Synthetic branch A\",\"departmentId\":1,\"departmentName\":\"قسم برّه الفرع\",\"title\":\"Synthetic analyst\",\"employees\":1,\"action\":\"skip\",\"reason\":\"قسمهم مش تبع فرعهم — صحّح القسم أو الفرع على ملفاتهم الأول\"}]}}\n",
    "REVIEW_MEASURE {\"case\":\"foreign-team-name\",\"detail\":{\"teamId\":1,\"teamName\":\"Foreign team identity after move\"},\"option\":{\"id\":2,\"code\":\"P-0002\",\"title\":\"Synthetic analyst\",\"gradeName\":null,\"departmentId\":1,\"departmentName\":\"Synthetic own department\",\"teamId\":1,\"teamName\":\"Foreign team identity after move\",\"headcount\":3,\"occupied\":0,\"vacant\":3}}\n",
    "REVIEW_MEASURE {\"case\":\"request-department-race\",\"approval\":201,\"positions\":[{\"id\":3,\"branchId\":1,\"departmentId\":3}],\"departmentCurrentBranch\":2}\n",
    "REVIEW_MEASURE {\"case\":\"generation-overwrites-link\",\"assigned\":4,\"final\":6,\"response\":{\"created\":2,\"linked\":2}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_independent_test_1fba0f49ff98c5e7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_independent_test_1fba0f49ff98c5e7\"}\n"
  ]
}
