module.exports = {
  "selected": [
    "codex-review-p5d-expense-transitive"
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
    "duration_ms": 47327.1532
  },
  "results": [
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: final approvals and expense/travel destinations share the held transaction connection",
      "ms": 44014.5356,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n    201,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n    201,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n    201,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n\n    at heldPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:115:147)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:146:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: final approvals and expense/travel destinations share the held transaction connection",
      "ms": 44014.5356,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n    201,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n    201,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n    201,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n\n    at heldPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:115:147)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:146:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_expense_reports_test_0fe7063029ed75e2 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 47327.1532"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_0fe7063029ed75e2\"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 77) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 81) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 84) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 80) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 79) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 82) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 78) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 76) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"errorCode\":\"EREQUEST\",\"number\":1205,\"message\":\"Error: Transaction (Process ID 71) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.\",\"query\":\"SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]\\n      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' \"}\n",
    "{\"REVIEW_MEASURE\":\"execute\",\"responses\":[{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":201},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"},{\"status\":400,\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\"}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_0fe7063029ed75e2\"}\n"
  ]
}
