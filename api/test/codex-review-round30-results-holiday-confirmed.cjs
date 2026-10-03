module.exports = {
  "selected": [
    "codex-review-round30-holiday-scope"
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
    "duration_ms": 9381.2888
  },
  "results": [
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday update: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 6056.8511,
      "pass": false,
      "error": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n+   branchId: 1,\n-   branchId: 2,\n    cancelReason: null,\n    cancelledAt: null,\n    cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:32.531Z,\n    createdByUserId: 3,\n...\n    multiplier: 2,\n+   name: 'CR30 stale A update',\n-   name: 'CR30 private B update',\n    note: null,\n    sourceRequestId: null,\n    status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n+   updatedAt: 2026-10-03T02:12:33.780Z,\n+   updatedByUserId: 3\n-   updatedAt: 2026-10-03T02:12:32.665Z,\n-   updatedByUserId: 1\n  }\n",
      "cause": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n+   branchId: 1,\n-   branchId: 2,\n    cancelReason: null,\n    cancelledAt: null,\n    cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:32.531Z,\n    createdByUserId: 3,\n...\n    multiplier: 2,\n+   name: 'CR30 stale A update',\n-   name: 'CR30 private B update',\n    note: null,\n    sourceRequestId: null,\n    status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n+   updatedAt: 2026-10-03T02:12:33.780Z,\n+   updatedByUserId: 3\n-   updatedAt: 2026-10-03T02:12:32.665Z,\n-   updatedByUserId: 1\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n+   branchId: 1,\n-   branchId: 2,\n    cancelReason: null,\n    cancelledAt: null,\n    cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:32.531Z,\n    createdByUserId: 3,\n...\n    multiplier: 2,\n+   name: 'CR30 stale A update',\n-   name: 'CR30 private B update',\n    note: null,\n    sourceRequestId: null,\n    status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n+   updatedAt: 2026-10-03T02:12:33.780Z,\n+   updatedByUserId: 3\n-   updatedAt: 2026-10-03T02:12:32.665Z,\n-   updatedByUserId: 1\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:36:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday cancel: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 833.3439,
      "pass": false,
      "error": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n    branchId: 2,\n+   cancelReason: 'فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي',\n+   cancelledAt: 2026-10-03T02:12:34.651Z,\n+   cancelledByUserId: 3,\n-   cancelReason: null,\n-   cancelledAt: null,\n-   cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:33.921Z,\n    createdByUserId: 3,\n    dates: '[\"2026-07-17\"]',\n    firstDate: '2026-07-17',\n    id: 2,\n...\n    sourceRequestId: null,\n+   status: 'CANCELLED',\n-   status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n    updatedAt: 2026-10-03T02:12:33.966Z,\n    updatedByUserId: 1\n  }\n",
      "cause": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n    branchId: 2,\n+   cancelReason: 'فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي',\n+   cancelledAt: 2026-10-03T02:12:34.651Z,\n+   cancelledByUserId: 3,\n-   cancelReason: null,\n-   cancelledAt: null,\n-   cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:33.921Z,\n    createdByUserId: 3,\n    dates: '[\"2026-07-17\"]',\n    firstDate: '2026-07-17',\n    id: 2,\n...\n    sourceRequestId: null,\n+   status: 'CANCELLED',\n-   status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n    updatedAt: 2026-10-03T02:12:33.966Z,\n    updatedByUserId: 1\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n    branchId: 2,\n+   cancelReason: 'فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي',\n+   cancelledAt: 2026-10-03T02:12:34.651Z,\n+   cancelledByUserId: 3,\n-   cancelReason: null,\n-   cancelledAt: null,\n-   cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:33.921Z,\n    createdByUserId: 3,\n    dates: '[\"2026-07-17\"]',\n    firstDate: '2026-07-17',\n    id: 2,\n...\n    sourceRequestId: null,\n+   status: 'CANCELLED',\n-   status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n    updatedAt: 2026-10-03T02:12:33.966Z,\n    updatedByUserId: 1\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:36:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday scope controls: ordinary foreign write is refused; authorized branch still updates and cancels",
      "ms": 123.3005,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday update: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 6056.8511,
      "pass": false,
      "error": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n+   branchId: 1,\n-   branchId: 2,\n    cancelReason: null,\n    cancelledAt: null,\n    cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:32.531Z,\n    createdByUserId: 3,\n...\n    multiplier: 2,\n+   name: 'CR30 stale A update',\n-   name: 'CR30 private B update',\n    note: null,\n    sourceRequestId: null,\n    status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n+   updatedAt: 2026-10-03T02:12:33.780Z,\n+   updatedByUserId: 3\n-   updatedAt: 2026-10-03T02:12:32.665Z,\n-   updatedByUserId: 1\n  }\n",
      "cause": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n+   branchId: 1,\n-   branchId: 2,\n    cancelReason: null,\n    cancelledAt: null,\n    cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:32.531Z,\n    createdByUserId: 3,\n...\n    multiplier: 2,\n+   name: 'CR30 stale A update',\n-   name: 'CR30 private B update',\n    note: null,\n    sourceRequestId: null,\n    status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n+   updatedAt: 2026-10-03T02:12:33.780Z,\n+   updatedByUserId: 3\n-   updatedAt: 2026-10-03T02:12:32.665Z,\n-   updatedByUserId: 1\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n+   branchId: 1,\n-   branchId: 2,\n    cancelReason: null,\n    cancelledAt: null,\n    cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:32.531Z,\n    createdByUserId: 3,\n...\n    multiplier: 2,\n+   name: 'CR30 stale A update',\n-   name: 'CR30 private B update',\n    note: null,\n    sourceRequestId: null,\n    status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n+   updatedAt: 2026-10-03T02:12:33.780Z,\n+   updatedByUserId: 3\n-   updatedAt: 2026-10-03T02:12:32.665Z,\n-   updatedByUserId: 1\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:36:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round30-holiday-scope.integration.cjs",
      "name": "CR30 holiday cancel: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 833.3439,
      "pass": false,
      "error": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n    branchId: 2,\n+   cancelReason: 'فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي',\n+   cancelledAt: 2026-10-03T02:12:34.651Z,\n+   cancelledByUserId: 3,\n-   cancelReason: null,\n-   cancelledAt: null,\n-   cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:33.921Z,\n    createdByUserId: 3,\n    dates: '[\"2026-07-17\"]',\n    firstDate: '2026-07-17',\n    id: 2,\n...\n    sourceRequestId: null,\n+   status: 'CANCELLED',\n-   status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n    updatedAt: 2026-10-03T02:12:33.966Z,\n    updatedByUserId: 1\n  }\n",
      "cause": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n    branchId: 2,\n+   cancelReason: 'فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي',\n+   cancelledAt: 2026-10-03T02:12:34.651Z,\n+   cancelledByUserId: 3,\n-   cancelReason: null,\n-   cancelledAt: null,\n-   cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:33.921Z,\n    createdByUserId: 3,\n    dates: '[\"2026-07-17\"]',\n    firstDate: '2026-07-17',\n    id: 2,\n...\n    sourceRequestId: null,\n+   status: 'CANCELLED',\n-   status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n    updatedAt: 2026-10-03T02:12:33.966Z,\n    updatedByUserId: 1\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n    branchId: 2,\n+   cancelReason: 'فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي',\n+   cancelledAt: 2026-10-03T02:12:34.651Z,\n+   cancelledByUserId: 3,\n-   cancelReason: null,\n-   cancelledAt: null,\n-   cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:33.921Z,\n    createdByUserId: 3,\n    dates: '[\"2026-07-17\"]',\n    firstDate: '2026-07-17',\n    id: 2,\n...\n    sourceRequestId: null,\n+   status: 'CANCELLED',\n-   status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n    updatedAt: 2026-10-03T02:12:33.966Z,\n    updatedByUserId: 1\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-holiday-scope.integration.cjs:36:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"holiday-order-branch-race\",\"action\":\"update\",\"companyChange\":200,\"oldBranchReadAfterChange\":404,\"oldMutationStatus\":200,\"before\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"after\":{\"branchId\":1,\"status\":\"ACTIVE\"},\"creditBefore\":{\"status\":\"PENDING\",\"amount\":300},\"creditAfter\":{\"status\":\"CANCELLED\",\"amount\":300}}",
    "{\"case\":\"holiday-order-branch-race\",\"action\":\"cancel\",\"companyChange\":200,\"oldBranchReadAfterChange\":404,\"oldMutationStatus\":404,\"before\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"after\":{\"branchId\":2,\"status\":\"CANCELLED\"},\"creditBefore\":{\"status\":\"PENDING\",\"amount\":300},\"creditAfter\":{\"status\":\"CANCELLED\",\"amount\":300}}",
    "{\"case\":\"holiday-order-controls\",\"foreignUpdate\":404,\"foreignCancel\":404,\"authorizedUpdate\":200,\"authorizedCancel\":201}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9381.2888"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r30_holiday_scope_test_2ffbd36e7ff4397c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r30_holiday_scope_test_2ffbd36e7ff4397c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r30_holiday_scope_test_2ffbd36e7ff4397c\"}\n"
  ]
}
