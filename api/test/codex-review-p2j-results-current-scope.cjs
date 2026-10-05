module.exports = {
  "selected": [
    "codex-review-p2j-current-scope"
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
    "duration_ms": 14681.4637
  },
  "results": [
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J current-branch rule must also conceal the transferred delegate in the audit summary and search",
      "ms": 10638.4263,
      "pass": false,
      "error": "PATCH /employees/2: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/2: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/2: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:26:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J both creation and revocation summaries must respect the transferred delegator current branch",
      "ms": 459.0236,
      "pass": false,
      "error": "PATCH /employees/3: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/3: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/3: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:47:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J identities become readable after moving into scope, all-branch and party views remain stable, and revoke still works",
      "ms": 440.0831,
      "pass": false,
      "error": "PATCH /employees/6: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/6: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/6: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:64:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J unrelated audit event response remains exactly the same for branch and all-branch readers",
      "ms": 338.4504,
      "pass": false,
      "error": "PATCH /employees/8: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/8: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/8: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:81:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J current-branch rule must also conceal the transferred delegate in the audit summary and search",
      "ms": 10638.4263,
      "pass": false,
      "error": "PATCH /employees/2: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/2: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/2: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:26:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J both creation and revocation summaries must respect the transferred delegator current branch",
      "ms": 459.0236,
      "pass": false,
      "error": "PATCH /employees/3: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/3: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/3: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:47:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J identities become readable after moving into scope, all-branch and party views remain stable, and revoke still works",
      "ms": 440.0831,
      "pass": false,
      "error": "PATCH /employees/6: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/6: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/6: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:64:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J unrelated audit event response remains exactly the same for branch and all-branch readers",
      "ms": 338.4504,
      "pass": false,
      "error": "PATCH /employees/8: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "cause": "PATCH /employees/8: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/8: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:81:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 14681.4637"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2j_current_scope_test_189edc4425b7cbe1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2j_current_scope_test_189edc4425b7cbe1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2j_current_scope_test_189edc4425b7cbe1\"}\n"
  ]
}
