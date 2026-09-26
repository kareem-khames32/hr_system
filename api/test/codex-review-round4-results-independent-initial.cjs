module.exports = {
  "selected": [
    "codex-review-round4-independent"
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
    "duration_ms": 6257.509
  },
  "results": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 3814.139,
      "pass": false,
      "error": "Uppercase key bypassed category-chain endpoint and permissions",
      "cause": "Uppercase key bypassed category-chain endpoint and permissions",
      "stack": "AssertionError [ERR_ASSERTION]: Uppercase key bypassed category-chain endpoint and permissions\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 30.4955,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:36:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 3.7738,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 3814.139,
      "pass": false,
      "error": "Uppercase key bypassed category-chain endpoint and permissions",
      "cause": "Uppercase key bypassed category-chain endpoint and permissions",
      "stack": "AssertionError [ERR_ASSERTION]: Uppercase key bypassed category-chain endpoint and permissions\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 30.4955,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:36:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"category-case-folding\",\"canonicalStatus\":400,\"directStatus\":403,\"uppercaseStatus\":200,\"storedCategoryChain\":2,\"typeChain\":1,\"expectedChain\":1}",
    "{\"probe\":\"request-existence\",\"foreign\":403,\"missing\":404,\"foreignBody\":{\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403},\"missingBody\":{\"message\":\"الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"exemption-existence\",\"foreign\":404,\"missing\":404,\"foreignBody\":{\"message\":\"Cannot POST /api/attendance/exemptions\",\"error\":\"Not Found\",\"statusCode\":404},\"missingBody\":{\"message\":\"Cannot POST /api/attendance/exemptions\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6257.509"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_r4independent_test_5d5f04292053a701\"}\n"
  ]
}
