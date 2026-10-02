module.exports = {
  "selected": [
    "codex-review-round25-correction-edges"
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
    "duration_ms": 13879.8435
  },
  "results": [
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 shared-root reconciliation retains only reader items and identical company totals",
      "ms": 7091.4191,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "ms": 2088.1165,
      "pass": false,
      "error": "Foreign child net must not leak through correction.children",
      "cause": "Foreign child net must not leak through correction.children",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign child net must not leak through correction.children\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:40:35)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "ms": 2100.6279,
      "pass": false,
      "error": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "cause": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:58:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "ms": 2088.1165,
      "pass": false,
      "error": "Foreign child net must not leak through correction.children",
      "cause": "Foreign child net must not leak through correction.children",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign child net must not leak through correction.children\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:40:35)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "ms": 2100.6279,
      "pass": false,
      "error": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "cause": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:58:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"correction-shared-root\",\"branchOriginal\":\"6321.19\",\"companyOriginal\":\"24700.80\",\"hiddenTotal\":null,\"knownParentHeader\":true,\"reversalId\":2}",
    "{\"case\":\"correction-child-after-transfer\",\"parentSnapshotBranch\":1,\"childSnapshotBranch\":2,\"childDirectGet\":403,\"childNet\":9876.54,\"reconciliationHidesChild\":true,\"returnedChildren\":[{\"id\":6,\"name\":\"تكميلي باء السري بعد النقل\",\"period\":\"2026-07\",\"status\":\"CALCULATED\",\"runType\":\"SUPPLEMENTARY\",\"runTypeLabel\":\"مسير تكميلي\",\"totalNet\":\"9876.54\",\"createdAt\":\"2026-10-02T20:12:31.490Z\",\"correctionReason\":\"تصحيح راتب بعد تغيير الفرع\"},{\"id\":6,\"name\":\"تكميلي باء السري بعد النقل\",\"period\":\"2026-07\",\"status\":\"CALCULATED\",\"runType\":\"SUPPLEMENTARY\",\"runTypeLabel\":\"مسير تكميلي\",\"totalNet\":\"9876.54\",\"createdAt\":\"2026-10-02T20:12:31.490Z\",\"correctionReason\":\"تصحيح راتب بعد تغيير الفرع\"}]}",
    "{\"case\":\"forward-calculated-foreign\",\"beforeStatus\":\"CALCULATED\",\"readStatus\":403,\"forwardSnapshotBranch\":2,\"profileNowBranch\":1,\"beforeDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"afterDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[1],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5,6],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"eventsAdded\":1,\"returnedRecalculateRuns\":[]}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13879.8435"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_correction_edges_test_b7f431dd7a9f2cd7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_correction_edges_test_b7f431dd7a9f2cd7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_correction_edges_test_b7f431dd7a9f2cd7\"}\n"
  ]
}
