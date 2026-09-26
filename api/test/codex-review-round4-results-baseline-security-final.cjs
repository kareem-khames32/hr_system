module.exports = {
  "selected": [
    "codex-review-round4-edges",
    "codex-review-round4-independent"
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
    "duration_ms": 19672.8329
  },
  "results": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 foreign work schedule and shift history must respect branch scope",
      "ms": 4570.6975,
      "pass": false,
      "error": "Foreign branch rule history was returned",
      "cause": "Foreign branch rule history was returned",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign branch rule history was returned\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:66:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 2947.3661,
      "pass": false,
      "error": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "cause": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual run approved by its own calculator without licence permission\n\n201 !== 403\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:106:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 4156.4052,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 40.9079,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:45:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 foreign work schedule and shift history must respect branch scope",
      "ms": 4570.6975,
      "pass": false,
      "error": "Foreign branch rule history was returned",
      "cause": "Foreign branch rule history was returned",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign branch rule history was returned\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:66:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-edges.integration.cjs",
      "name": "CR4 unauthorized upper-case licence makes real self-calculated payroll approve",
      "ms": 2947.3661,
      "pass": false,
      "error": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "cause": "Actual run approved by its own calculator without licence permission\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual run approved by its own calculator without licence permission\n\n201 !== 403\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round4-edges.integration.cjs:106:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside request and nonexistent request must not reveal existence",
      "ms": 4156.4052,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'لا تملك صلاحية عرض هذا الطلب',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الطلب غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round4-independent.integration.cjs",
      "name": "CR4 outside exemption target and missing target must not reveal existence",
      "ms": 40.9079,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    body: {\n+     error: 'Forbidden',\n+     message: 'الموظف خارج الفرع المسموح لك',\n+     statusCode: 403\n-     error: 'Not Found',\n-     message: 'الموظف غير موجود',\n-     statusCode: 404\n    },\n+   status: 403\n-   status: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round4-independent.integration.cjs:45:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"probe\":\"foreign-rule-history\",\"probes\":[{\"kind\":\"WORK_SCHEDULE\",\"status\":200,\"rows\":1,\"exposesReason\":true},{\"kind\":\"SHIFT\",\"status\":200,\"rows\":1,\"exposesReason\":true}]}",
    "{\"probe\":\"actual-self-approval\",\"beforeStatus\":403,\"beforeCode\":\"PAYRUN-STATE-003\",\"uppercasePatch\":200,\"afterStatus\":201,\"savedStatus\":\"APPROVED\",\"approvedBy\":4,\"calculator\":4,\"actorHasLicence\":false}",
    "{\"probe\":\"request-existence\",\"foreign\":403,\"missing\":404,\"foreignBody\":{\"message\":\"لا تملك صلاحية عرض هذا الطلب\",\"error\":\"Forbidden\",\"statusCode\":403},\"missingBody\":{\"message\":\"الطلب غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "{\"probe\":\"exemption-existence\",\"foreign\":403,\"missing\":404,\"foreignBody\":{\"message\":\"الموظف خارج الفرع المسموح لك\",\"error\":\"Forbidden\",\"statusCode\":403},\"missingBody\":{\"message\":\"الموظف غير موجود\",\"error\":\"Not Found\",\"statusCode\":404}}",
    "tests 4",
    "suites 0",
    "pass 0",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 19672.8329"
  ],
  "stdout": [
    "CR4_BASELINE {\"commit\":\"6b20663\",\"productFilesInMemory\":72,\"legacyTokenFixture\":true,\"productFilesWritten\":0}\n",
    "CR4_BASELINE_VERIFIED legacy numeric branch scope\n",
    "{\"cleanupVerified\":\"hr_codex_r4edges_test_93e2690538c16d53\"}\n",
    "CR4_BASELINE {\"commit\":\"6b20663\",\"productFilesInMemory\":72,\"legacyTokenFixture\":true,\"productFilesWritten\":0}\n",
    "CR4_BASELINE_VERIFIED legacy numeric branch scope\n",
    "{\"cleanupVerified\":\"hr_codex_r4independent_test_9e4268555e912504\"}\n"
  ]
}
