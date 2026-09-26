module.exports = {
  "selected": [
    "codex-review-round7-money",
    "codex-review-round7-holiday-edges"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 10,
      "failed": 2,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 18949.1619
  },
  "results": [
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: paid run, one reversal and one supplementary preserve 1000 once and reconcile all surfaces",
      "ms": 6066.025,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: sick and unpaid deductions leave the pressure amount whole, with an independent zero-allowance control",
      "ms": 397.3464,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: 31-day month full coverage and mid-month joiner truncate independently to cents",
      "ms": 338.8734,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: thirty suspension days consume only the six-component salary",
      "ms": 462.8957,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: floor is computed from 6000 and the pressure is added after the floor",
      "ms": 245.7527,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 security: pressure salary stays hidden from a non-financial employee reader and cannot be patched directly",
      "ms": 43.6625,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 settlement: mid-month leaver receives pressure through one last-salary line and is excluded from bank payout",
      "ms": 930.1965,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 salary source: a pressure-only dated change after calculation invalidates approval",
      "ms": 574.8877,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 5060.2436,
      "pass": false,
      "error": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "cause": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:43:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 168.419,
      "pass": false,
      "error": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "cause": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:59:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 5060.2436,
      "pass": false,
      "error": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "cause": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:43:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 168.419,
      "pass": false,
      "error": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "cause": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:59:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 10",
    "suites 0",
    "pass 8",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18949.1619"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7money_test_815883815ff645f7\"}\n",
    "CR7_EVIDENCE {\"case\":\"sql-environment\",\"rows\":[{\"productVersion\":\"16.0.4255.1\",\"compatibility_level\":150}]}\n",
    "CR7_EVIDENCE {\"case\":\"money-reversal\",\"original\":7000,\"reversal\":-7000,\"supplementary\":7000,\"netRegister\":7000,\"pressureRegister\":1000,\"rows\":[{\"runId\":3,\"net\":\"7000.00\",\"pressure\":\"1000.00\"}]}\n",
    "CR7_EVIDENCE {\"case\":\"sick-and-unpaid\",\"sick\":200,\"unpaid\":400,\"baseNet\":5400,\"withPressure\":6400}\n",
    "CR7_EVIDENCE {\"case\":\"31-day-proration\",\"full\":7000.01,\"joinerDays\":15,\"joinerPressure\":500,\"joinerNet\":3500}\n",
    "CR7_EVIDENCE {\"case\":\"suspension\",\"days\":30,\"deduction\":6000,\"netPaid\":1000}\n",
    "CR7_EVIDENCE {\"case\":\"net-floor\",\"basis\":6000,\"floor\":3000,\"collected\":3000,\"carried\":2800,\"pressure\":1000,\"net\":4000}\n",
    "CR7_EVIDENCE {\"case\":\"salary-security\",\"readStatus\":200,\"hidden\":true,\"writeStatus\":403}\n",
    "CR7_EVIDENCE {\"case\":\"settlement\",\"serviceDays\":15,\"lastSalary\":3500,\"controlSalary\":3000,\"pressure\":500,\"eos\":8367.12,\"bankRows\":0,\"settlementTotal\":6500,\"repeatStatus\":400}\n",
    "CR7_EVIDENCE {\"case\":\"stale-pressure-source\",\"status\":409,\"body\":{\"code\":\"PAYRUN-SALARY-CHANGED\",\"message\":\"راتب شهر المسير للموظف #11 تغيّر في سجل الأجر أو إعداد مصدره بعد الحساب؛ أعد حساب المسودة قبل الاعتماد\"}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7money_test_815883815ff645f7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7money_test_815883815ff645f7\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7holiday_test_15faa70f210f5c8f\"}\n",
    "CR7_EVIDENCE {\"case\":\"dated-department-holiday-work\",\"calendar\":\"HOLIDAY\",\"status\":400,\"body\":{\"message\":\"2026-09-15 يوم عمل عادي — أمر الدوام لأيام العطلة (الويك إند أو العطلات الرسمية) بس\",\"error\":\"Bad Request\",\"statusCode\":400}}\n",
    "CR7_EVIDENCE {\"case\":\"branch-live-source-isolation\",\"sourceStatus\":200,\"leaked\":true,\"matches\":[{\"path\":\"$.snapshot.sections.schedule.data.calendarEvidence.holidays.1\",\"value\":{\"audience\":{\"branchId\":2,\"level\":\"employees\"},\"country\":\"EG\",\"date\":\"2026-09-15\",\"endDate\":null,\"id\":2,\"name\":\"CR7_PRIVATE_BRANCH_B_HOLIDAY\",\"sourceRef\":\"public_holidays:2\"}}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7holiday_test_15faa70f210f5c8f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7holiday_test_15faa70f210f5c8f\"}\n"
  ]
}
