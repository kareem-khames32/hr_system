module.exports = {
  "selected": [
    "codex-review-round7-money"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 8627.6133
  },
  "results": [
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: paid run, one reversal and one supplementary preserve 1000 once and reconcile all surfaces",
      "ms": 5652.2875,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: sick and unpaid deductions leave the pressure amount whole, with an independent zero-allowance control",
      "ms": 421.3972,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: 31-day month full coverage and mid-month joiner truncate independently to cents",
      "ms": 330.9044,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8627.6133"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7money_test_c5812d1b83619878\"}\n",
    "CR7_EVIDENCE {\"case\":\"money-reversal\",\"original\":7000,\"reversal\":-7000,\"supplementary\":7000,\"netRegister\":7000,\"pressureRegister\":1000,\"rows\":[{\"runId\":3,\"net\":\"7000.00\",\"pressure\":\"1000.00\"}]}\n",
    "CR7_EVIDENCE {\"case\":\"sick-and-unpaid\",\"sick\":200,\"unpaid\":400,\"baseNet\":5400,\"withPressure\":6400}\n",
    "CR7_EVIDENCE {\"case\":\"31-day-proration\",\"full\":7000.01,\"joinerDays\":15,\"joinerPressure\":500,\"joinerNet\":3500}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7money_test_c5812d1b83619878\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7money_test_c5812d1b83619878\"}\n"
  ]
}
