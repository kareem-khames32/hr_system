module.exports = {
  "selected": [
    "decimal-output-precision"
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
    "duration_ms": 10042.9356
  },
  "results": [
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-03: إنشاء موظف ببدلات فيها كسور — المحفوظ بالقرش (الإنشاء بيحفظ الكائن مرتين)",
      "ms": 7068.5254,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    basicSalary: 4500.5,\n+   housingAllowance: 1251,\n+   otherAllowance: 100,\n+   transportAllowance: 300,\n+   workPressureAllowance: 10\n-   housingAllowance: 1250.5,\n-   otherAllowance: 99.99,\n-   transportAllowance: 300.25,\n-   workPressureAllowance: 10.1\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    basicSalary: 4500.5,\n+   housingAllowance: 1251,\n+   otherAllowance: 100,\n+   transportAllowance: 300,\n+   workPressureAllowance: 10\n-   housingAllowance: 1250.5,\n-   otherAllowance: 99.99,\n-   transportAllowance: 300.25,\n-   workPressureAllowance: 10.1\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    basicSalary: 4500.5,\n+   housingAllowance: 1251,\n+   otherAllowance: 100,\n+   transportAllowance: 300,\n+   workPressureAllowance: 10\n-   housingAllowance: 1250.5,\n-   otherAllowance: 99.99,\n-   transportAllowance: 300.25,\n-   workPressureAllowance: 10.1\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\decimal-output-precision.integration.cjs:127:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-03: إنشاء موظف ببدلات فيها كسور — المحفوظ بالقرش (الإنشاء بيحفظ الكائن مرتين)",
      "ms": 7068.5254,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    basicSalary: 4500.5,\n+   housingAllowance: 1251,\n+   otherAllowance: 100,\n+   transportAllowance: 300,\n+   workPressureAllowance: 10\n-   housingAllowance: 1250.5,\n-   otherAllowance: 99.99,\n-   transportAllowance: 300.25,\n-   workPressureAllowance: 10.1\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    basicSalary: 4500.5,\n+   housingAllowance: 1251,\n+   otherAllowance: 100,\n+   transportAllowance: 300,\n+   workPressureAllowance: 10\n-   housingAllowance: 1250.5,\n-   otherAllowance: 99.99,\n-   transportAllowance: 300.25,\n-   workPressureAllowance: 10.1\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    basicSalary: 4500.5,\n+   housingAllowance: 1251,\n+   otherAllowance: 100,\n+   transportAllowance: 300,\n+   workPressureAllowance: 10\n-   housingAllowance: 1250.5,\n-   otherAllowance: 99.99,\n-   transportAllowance: 300.25,\n-   workPressureAllowance: 10.1\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\decimal-output-precision.integration.cjs:127:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_decimal_precision_test_068b35bff4b0d62d is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10042.9356"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"f38d8c4\",\"sourceFiles\":435}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_decimal_precision_test_068b35bff4b0d62d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_decimal_precision_test_068b35bff4b0d62d\"}\n"
  ]
}
