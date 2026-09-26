module.exports = {
  "selected": [
    "codex-review-round4-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 7,
      "failed": 5,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 10170.0936
  },
  "results": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 6430.2463,
      "pass": false,
      "error": "Uppercase key bypassed category-chain endpoint and permissions",
      "cause": "Uppercase key bypassed category-chain endpoint and permissions",
      "stack": "AssertionError [ERR_ASSERTION]: Uppercase key bypassed category-chain endpoint and permissions\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 38.5694,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 39.4997,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:45:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 payroll separation licence cannot evade its specific permission by SQL case folding",
      "ms": 76.6988,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:58:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 111.9698,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== 0\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:69:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 HR permission grants one financial effect for another employee, never own request or outside scope",
      "ms": 305.0213,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 exemption subject cannot approve or reject an exemption created by someone else",
      "ms": 71.0683,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 category config PATCH cannot evade its guard with SQL case folding",
      "ms": 6430.2463,
      "pass": false,
      "error": "Uppercase key bypassed category-chain endpoint and permissions",
      "cause": "Uppercase key bypassed category-chain endpoint and permissions",
      "stack": "AssertionError [ERR_ASSERTION]: Uppercase key bypassed category-chain endpoint and permissions\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 38.5694,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 39.4997,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:45:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 payroll separation licence cannot evade its specific permission by SQL case folding",
      "ms": 76.6988,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:58:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 archived employee without an offboarding case is not absent in either attendance view",
      "ms": 111.9698,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== 0\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:69:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"category-case-folding\",\"canonicalStatus\":400,\"directStatus\":403,\"uppercaseStatus\":200,\"storedCategoryChain\":2,\"typeChain\":1,\"expectedChain\":1}",
    "{\"probe\":\"request-existence\",\"foreign\":403,\"missing\":404,\"foreignBody\":{\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403},\"missingBody\":{\"message\":\"الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"exemption-existence\",\"foreign\":403,\"missing\":404,\"foreignBody\":{\"message\":\"الموظف خارج الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403},\"missingBody\":{\"message\":\"الموظف غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"payroll-licence-case-folding\",\"normalStatus\":403,\"uppercaseStatus\":200,\"storedValue\":\"true\",\"actorHasLicence\":false}",
    "{\"probe\":\"archive-fallback-report\",\"dailyAbsent\":false,\"reportAbsentDays\":1,\"expected\":0}",
    "{\"probe\":\"HR-financial-once\",\"manualAmount\":123.45,\"actualAmount\":123.45,\"obligations\":1,\"retryStatuses\":[400,400],\"ownStatus\":\"UNDER_REVIEW\",\"clerkStatus\":\"UNDER_REVIEW\",\"outsideStatus\":403}",
    "{\"probe\":\"exemption-subject-SOD\",\"approve\":403,\"reject\":403,\"state\":\"PENDING\"}",
    "tests 7",
    "suites 0",
    "pass 2",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10170.0936"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_r4independent_test_a7f76aa9b30fccd0\"}\n"
  ]
}
