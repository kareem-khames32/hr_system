module.exports = {
  "selected": [
    "codex-review-p5d-expense-transitive"
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
    "duration_ms": 31826.3495
  },
  "results": [
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T01: structural approval-chain resolution still requests another connection during expense submit",
      "ms": 13050.422,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: independent final approvals can deadlock in human approval lookup, roll back and retry safely",
      "ms": 16067.9097,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(result.errors.every(e=>e.number===1205&&e.query.includes('request_approvals')))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(result.errors.every(e=>e.number===1205&&e.query.includes('request_approvals')))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(result.errors.every(e=>e.number===1205&&e.query.includes('request_approvals')))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:147:68)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: independent final approvals can deadlock in human approval lookup, roll back and retry safely",
      "ms": 16067.9097,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(result.errors.every(e=>e.number===1205&&e.query.includes('request_approvals')))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(result.errors.every(e=>e.number===1205&&e.query.includes('request_approvals')))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(result.errors.every(e=>e.number===1205&&e.query.includes('request_approvals')))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:147:68)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5D-T01\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"errors\":[{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"},{\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}],\"serialRetry\":201}",
    "{\"id\":\"P5D-T01-control\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"errors\":[]}",
    "Cleanup verified: hr_expense_reports_test_c51b36a32a123c2a is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 31826.3495"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_c51b36a32a123c2a\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"message\":\"operation timed out for an unknown reason\",\"query\":\"SELECT \\\"Employee\\\".\\\"id\\\" AS \\\"Employee_id\\\", \\\"Employee\\\".\\\"employeeCode\\\" AS \\\"Employee_employeeCode\\\", \\\"Employee\\\".\\\"fingerprintCode\\\" AS \\\"Employee_fingerprintCode\\\", \\\"Empl\"}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"responses\":[{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"},{\"status\":500,\"message\":\"Internal server error\"}]}\n",
    "{\"REVIEW_MEASURE\":\"resolveChain\",\"responses\":[{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201},{\"status\":201}]}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 55) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 57) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 70) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 65) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 72) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 67) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 69) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 63) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"ETIMEOUT\",\"number\":\"ETIMEOUT\",\"message\":\"Error: Timeout: Request failed to complete in 15000ms\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"ETIMEOUT\",\"number\":\"ETIMEOUT\",\"message\":\"Error: Timeout: Request failed to complete in 15000ms\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_c51b36a32a123c2a\"}\n"
  ]
}
