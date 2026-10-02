module.exports = {
  "selected": [
    "codex-review-round25-correction-edges"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 3,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 16043.5847
  },
  "results": [
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 shared-root reconciliation retains only reader items and identical company totals",
      "ms": 7145.2631,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "ms": 1911.1277,
      "pass": false,
      "error": "Foreign child net must not leak through correction.children",
      "cause": "Foreign child net must not leak through correction.children",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign child net must not leak through correction.children\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:40:35)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "ms": 1903.2441,
      "pass": false,
      "error": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "cause": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:58:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 an old payslip must not reveal a paid supplementary item recorded in another branch",
      "ms": 2656.1449,
      "pass": false,
      "error": "A branch reader must not receive the foreign supplementary item through the old payslip",
      "cause": "A branch reader must not receive the foreign supplementary item through the old payslip",
      "stack": "AssertionError [ERR_ASSERTION]: A branch reader must not receive the foreign supplementary item through the old payslip\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:74:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "ms": 1911.1277,
      "pass": false,
      "error": "Foreign child net must not leak through correction.children",
      "cause": "Foreign child net must not leak through correction.children",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign child net must not leak through correction.children\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:40:35)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "ms": 1903.2441,
      "pass": false,
      "error": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "cause": "An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n",
      "stack": "AssertionError [ERR_ASSERTION]: An unreadable calculated payroll must not have its membership definition rewritten\n+ actual - expected\n\n+ '{\"version\":1,\"filters\":{\"branchIds\":[1],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5,6],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n- '{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:58:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 an old payslip must not reveal a paid supplementary item recorded in another branch",
      "ms": 2656.1449,
      "pass": false,
      "error": "A branch reader must not receive the foreign supplementary item through the old payslip",
      "cause": "A branch reader must not receive the foreign supplementary item through the old payslip",
      "stack": "AssertionError [ERR_ASSERTION]: A branch reader must not receive the foreign supplementary item through the old payslip\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-correction-edges.integration.cjs:74:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"correction-shared-root\",\"branchOriginal\":\"6321.19\",\"companyOriginal\":\"24700.80\",\"hiddenTotal\":null,\"knownParentHeader\":true,\"reversalId\":2}",
    "{\"case\":\"correction-child-after-transfer\",\"parentSnapshotBranch\":1,\"childSnapshotBranch\":2,\"childDirectGet\":403,\"childNet\":9876.54,\"reconciliationHidesChild\":true,\"returnedChildren\":[{\"id\":6,\"name\":\"تكميلي باء السري بعد النقل\",\"period\":\"2026-07\",\"status\":\"CALCULATED\",\"runType\":\"SUPPLEMENTARY\",\"runTypeLabel\":\"مسير تكميلي\",\"totalNet\":\"9876.54\",\"createdAt\":\"2026-10-02T20:24:06.256Z\",\"correctionReason\":\"تصحيح راتب بعد تغيير الفرع\"},{\"id\":6,\"name\":\"تكميلي باء السري بعد النقل\",\"period\":\"2026-07\",\"status\":\"CALCULATED\",\"runType\":\"SUPPLEMENTARY\",\"runTypeLabel\":\"مسير تكميلي\",\"totalNet\":\"9876.54\",\"createdAt\":\"2026-10-02T20:24:06.256Z\",\"correctionReason\":\"تصحيح راتب بعد تغيير الفرع\"}]}",
    "{\"case\":\"forward-calculated-foreign\",\"beforeStatus\":\"CALCULATED\",\"readStatus\":403,\"forwardSnapshotBranch\":2,\"profileNowBranch\":1,\"beforeDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"afterDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[1],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5,6],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"eventsAdded\":1,\"returnedRecalculateRuns\":[]}",
    "{\"case\":\"old-payslip-foreign-supplementary\",\"oldItem\":10,\"newItem\":11,\"directNewItemStatus\":404,\"branchReaderSupplementary\":[{\"runId\":11,\"name\":\"تكميلي باء المصروف المخفي\",\"status\":\"PAID\",\"itemId\":11,\"netPay\":\"9764.83\"}],\"employeeOwnSupplementaryVisible\":true}",
    "tests 4",
    "suites 0",
    "pass 1",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16043.5847"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_correction_edges_test_2a00641a362101f8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_correction_edges_test_2a00641a362101f8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_correction_edges_test_2a00641a362101f8\"}\n"
  ]
}
