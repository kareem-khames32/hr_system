module.exports = {
  "selected": [
    "codex-review-p4a-tax",
    "codex-review-p4a-export"
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
    "duration_ms": 23306.9653
  },
  "results": [
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F01: API activation accepts a verified successor but payroll deducts with its unverified predecessor",
      "ms": 15919.9617,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D01: canonical confidential leave definition leaks through data export",
      "ms": 15670.2592,
      "pass": false,
      "error": "{\"message\":\"نوع الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "cause": "{\"message\":\"نوع الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"نوع الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:30:43)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:106:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D02: export reads new branch documents after old branch authorization",
      "ms": 287.6593,
      "pass": false,
      "error": "{\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n\n400 !== 200\n",
      "cause": "{\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n\n400 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:30:43)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:123:2)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D01: canonical confidential leave definition leaks through data export",
      "ms": 15670.2592,
      "pass": false,
      "error": "{\"message\":\"نوع الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "cause": "{\"message\":\"نوع الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"نوع الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:30:43)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:106:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D02: export reads new branch documents after old branch authorization",
      "ms": 287.6593,
      "pass": false,
      "error": "{\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n\n400 !== 200\n",
      "cause": "{\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}\n\n400 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:30:43)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-export.integration.cjs:123:2)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"oldVerified\":false,\"tableVerified\":false,\"tax\":1482.5,\"net\":11867.5,\"approved\":true}",
    "Cleanup verified: hr_payroll_statutory_test_840db584e03e4706 is absent from sys.databases.",
    "Cleanup verified: hr_employee_privacy_test_6356acc53e4b282a is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23306.9653"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_840db584e03e4706\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_840db584e03e4706\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_6356acc53e4b282a\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_6356acc53e4b282a\"}\n"
  ]
}
