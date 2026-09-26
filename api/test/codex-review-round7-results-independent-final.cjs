module.exports = {
  "selected": [
    "codex-review-round7-money",
    "codex-review-round7-holiday-edges"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 3,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 16027.1032
  },
  "results": [
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: paid run, one reversal and one supplementary preserve 1000 once and reconcile all surfaces",
      "ms": 5594.5564,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: sick and unpaid deductions leave the pressure amount whole, with an independent zero-allowance control",
      "ms": 389.3407,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: 31-day month full coverage and mid-month joiner truncate independently to cents",
      "ms": 312.4997,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: thirty suspension days consume only the six-component salary",
      "ms": 480.9688,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: floor is computed from 6000 and the pressure is added after the floor",
      "ms": 250.24,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 security: pressure salary stays hidden from a non-financial employee reader and cannot be patched directly",
      "ms": 40.6114,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(!JSON.stringify(view).includes('workPressureAllowance'))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(!JSON.stringify(view).includes('workPressureAllowance'))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(!JSON.stringify(view).includes('workPressureAllowance'))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-money.integration.cjs:107:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4126.7759,
      "pass": false,
      "error": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "cause": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:43:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 172.6611,
      "pass": false,
      "error": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "cause": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:59:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 security: pressure salary stays hidden from a non-financial employee reader and cannot be patched directly",
      "ms": 40.6114,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(!JSON.stringify(view).includes('workPressureAllowance'))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(!JSON.stringify(view).includes('workPressureAllowance'))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(!JSON.stringify(view).includes('workPressureAllowance'))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-money.integration.cjs:107:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4126.7759,
      "pass": false,
      "error": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "cause": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:43:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 172.6611,
      "pass": false,
      "error": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "cause": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:59:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 8",
    "suites 0",
    "pass 5",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16027.1032"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7money_test_411792170aefeb82\"}\n",
    "CR7_EVIDENCE {\"case\":\"sql-environment\",\"rows\":[{\"productVersion\":\"16.0.4255.1\",\"compatibility_level\":150}]}\n",
    "CR7_EVIDENCE {\"case\":\"money-reversal\",\"original\":7000,\"reversal\":-7000,\"supplementary\":7000,\"netRegister\":7000,\"pressureRegister\":1000,\"rows\":[{\"runId\":3,\"net\":\"7000.00\",\"pressure\":\"1000.00\"}]}\n",
    "CR7_EVIDENCE {\"case\":\"sick-and-unpaid\",\"sick\":200,\"unpaid\":400,\"baseNet\":5400,\"withPressure\":6400}\n",
    "CR7_EVIDENCE {\"case\":\"31-day-proration\",\"full\":7000.01,\"joinerDays\":15,\"joinerPressure\":500,\"joinerNet\":3500}\n",
    "CR7_EVIDENCE {\"case\":\"suspension\",\"days\":30,\"deduction\":6000,\"netPaid\":1000}\n",
    "CR7_EVIDENCE {\"case\":\"net-floor\",\"basis\":6000,\"floor\":3000,\"collected\":3000,\"carried\":2800,\"pressure\":1000,\"net\":4000}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7money_test_411792170aefeb82\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7money_test_411792170aefeb82\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7holiday_test_008671afcbef72cc\"}\n",
    "CR7_EVIDENCE {\"case\":\"dated-department-holiday-work\",\"calendar\":\"HOLIDAY\",\"status\":400,\"body\":{\"message\":\"2026-09-15 يوم عمل عادي — أمر الدوام لأيام العطلة (الويك إند أو العطلات الرسمية) بس\",\"error\":\"Bad Request\",\"statusCode\":400}}\n",
    "CR7_EVIDENCE {\"case\":\"branch-live-source-isolation\",\"sourceStatus\":200,\"leaked\":true,\"matches\":[{\"path\":\"$.snapshot.sections.schedule.data.calendarEvidence.holidays.1\",\"value\":{\"audience\":{\"branchId\":2,\"level\":\"employees\"},\"country\":\"EG\",\"date\":\"2026-09-15\",\"endDate\":null,\"id\":2,\"name\":\"CR7_PRIVATE_BRANCH_B_HOLIDAY\",\"sourceRef\":\"public_holidays:2\"}}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7holiday_test_008671afcbef72cc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7holiday_test_008671afcbef72cc\"}\n"
  ]
}
