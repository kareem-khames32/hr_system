module.exports = {
  "selected": [
    "codex-review-p2w-empty-row-approval"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 6997.9932
  },
  "results": [
    {
      "file": "codex-review-p2w-empty-row-approval.integration.cjs",
      "name": "P2W approval crossing rehire must not spend extra days from an empty stale-anniversary row",
      "ms": 4688.7521,
      "pass": false,
      "error": "An approval must not spend three days when the new-service reference has fewer than two\n+ actual - expected\n\n+ Leave {\n+   attachmentDueDate: null,\n+   attachmentRef: null,\n+   attachmentStatus: null,\n+   days: 3,\n+   employeeId: 5,\n+   fromDate: '2027-01-29',\n+   id: 1,\n+   isUnpaid: false,\n+   leaveTypeCode: 'ANNUAL',\n+   period: 'FULL',\n+   requestId: 1,\n+   revokedAt: null,\n+   revokedByUserId: null,\n+   status: 'APPROVED',\n+   toDate: '2027-01-31'\n+ }\n- null\n",
      "cause": "An approval must not spend three days when the new-service reference has fewer than two\n+ actual - expected\n\n+ Leave {\n+   attachmentDueDate: null,\n+   attachmentRef: null,\n+   attachmentStatus: null,\n+   days: 3,\n+   employeeId: 5,\n+   fromDate: '2027-01-29',\n+   id: 1,\n+   isUnpaid: false,\n+   leaveTypeCode: 'ANNUAL',\n+   period: 'FULL',\n+   requestId: 1,\n+   revokedAt: null,\n+   revokedByUserId: null,\n+   status: 'APPROVED',\n+   toDate: '2027-01-31'\n+ }\n- null\n",
      "stack": "AssertionError [ERR_ASSERTION]: An approval must not spend three days when the new-service reference has fewer than two\n+ actual - expected\n\n+ Leave {\n+   attachmentDueDate: null,\n+   attachmentRef: null,\n+   attachmentStatus: null,\n+   days: 3,\n+   employeeId: 5,\n+   fromDate: '2027-01-29',\n+   id: 1,\n+   isUnpaid: false,\n+   leaveTypeCode: 'ANNUAL',\n+   period: 'FULL',\n+   requestId: 1,\n+   revokedAt: null,\n+   revokedByUserId: null,\n+   status: 'APPROVED',\n+   toDate: '2027-01-31'\n+ }\n- null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2w-empty-row-approval.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2w-empty-row-approval.integration.cjs",
      "name": "P2W approval crossing rehire must not spend extra days from an empty stale-anniversary row",
      "ms": 4688.7521,
      "pass": false,
      "error": "An approval must not spend three days when the new-service reference has fewer than two\n+ actual - expected\n\n+ Leave {\n+   attachmentDueDate: null,\n+   attachmentRef: null,\n+   attachmentStatus: null,\n+   days: 3,\n+   employeeId: 5,\n+   fromDate: '2027-01-29',\n+   id: 1,\n+   isUnpaid: false,\n+   leaveTypeCode: 'ANNUAL',\n+   period: 'FULL',\n+   requestId: 1,\n+   revokedAt: null,\n+   revokedByUserId: null,\n+   status: 'APPROVED',\n+   toDate: '2027-01-31'\n+ }\n- null\n",
      "cause": "An approval must not spend three days when the new-service reference has fewer than two\n+ actual - expected\n\n+ Leave {\n+   attachmentDueDate: null,\n+   attachmentRef: null,\n+   attachmentStatus: null,\n+   days: 3,\n+   employeeId: 5,\n+   fromDate: '2027-01-29',\n+   id: 1,\n+   isUnpaid: false,\n+   leaveTypeCode: 'ANNUAL',\n+   period: 'FULL',\n+   requestId: 1,\n+   revokedAt: null,\n+   revokedByUserId: null,\n+   status: 'APPROVED',\n+   toDate: '2027-01-31'\n+ }\n- null\n",
      "stack": "AssertionError [ERR_ASSERTION]: An approval must not spend three days when the new-service reference has fewer than two\n+ actual - expected\n\n+ Leave {\n+   attachmentDueDate: null,\n+   attachmentRef: null,\n+   attachmentStatus: null,\n+   days: 3,\n+   employeeId: 5,\n+   fromDate: '2027-01-29',\n+   id: 1,\n+   isUnpaid: false,\n+   leaveTypeCode: 'ANNUAL',\n+   period: 'FULL',\n+   requestId: 1,\n+   revokedAt: null,\n+   revokedByUserId: null,\n+   status: 'APPROVED',\n+   toDate: '2027-01-31'\n+ }\n- null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2w-empty-row-approval.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"empty-row-approval\",\"initialStatus\":400,\"initialResponse\":{\"message\":\"الرصيد غير كافٍ: المتبقي 1.67 يوم والمطلوب 3\",\"error\":\"Bad Request\",\"statusCode\":400},\"retryStatus\":201,\"retryResponse\":{\"id\":1,\"typeCode\":\"LEAVE\",\"definitionCode\":\"P2W_ANNUAL\",\"requesterId\":5,\"createdByUserId\":10,\"branchId\":1,\"status\":\"COMPLETED\",\"currentStep\":null,\"payload\":\"{\\\"leaveTypeCode\\\":\\\"ANNUAL\\\",\\\"fromDate\\\":\\\"2027-01-29\\\",\\\"toDate\\\":\\\"2027-01-31\\\",\\\"days\\\":3,\\\"reason\\\":\\\"Pending leave from before service closure\\\"}\",\"destinationRef\":\"LV-2026-000001\",\"resolvedSteps\":\"[{\\\"stepOrder\\\":1,\\\"role\\\":\\\"hr\\\",\\\"approverEmployeeId\\\":null,\\\"dueAt\\\":null,\\\"action\\\":\\\"APPROVED\\\",\\\"actedAt\\\":\\\"2026-10-06T22:26:05.518Z\\\"}]\",\"createdAt\":\"2026-10-06T19:26:05.260Z\",\"submittedAt\":null,\"completedAt\":\"2026-10-06T22:26:05.000Z\",\"executionTaskId\":null},\"referenceRemaining\":1.67,\"approvedDays\":3,\"rows\":[{\"period\":\"2026\",\"taken\":0},{\"period\":\"2026\",\"taken\":0},{\"period\":\"2026-09-01\",\"taken\":3}]}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6997.9932"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2w_empty_row_approval_test_f74aee8ba09b821c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2w_empty_row_approval_test_f74aee8ba09b821c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2w_empty_row_approval_test_f74aee8ba09b821c\"}\n"
  ]
}
