module.exports = {
  "selected": [
    "codex-review-round2-performance"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 114302.3455
  },
  "results": [
    {
      "file": "codex-review-round2-performance.integration.cjs",
      "name": "CR2 PERF calculate exactly 500 synthetic employees and independently reconcile 3900000",
      "ms": 92714.3732,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"employees\":500,\"days\":15000,\"manual\":\"500*(6000+1200+600)=3900000\",\"actual\":3900000,\"status\":\"CALCULATED\"}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 114302.3455"
  ],
  "stdout": [
    "REVIEW_MEASURE {\"label\":\"draft 500\",\"route\":\"/payroll/runs\",\"queries\":537,\"writes\":0,\"transactions\":2,\"maxTransactionMs\":712.5547000000006,\"rssStartMiB\":585.8125,\"peakRssMiB\":594.9140625,\"ms\":750.2364000000016,\"status\":201,\"responseBytes\":2766,\"rows\":0,\"topSql\":[{\"group\":\"SELECT employee_salary_history_versions\",\"count\":500,\"ms\":306.79589999996824},{\"group\":\"SELECT payroll_runs\",\"count\":4,\"ms\":126.72569999999541},{\"group\":\"SELECT employee_suspensions\",\"count\":1,\"ms\":79.45829999999842},{\"group\":\"SELECT offboarding_cases\",\"count\":1,\"ms\":63.92149999999674},{\"group\":\"SELECT payroll_period_claims\",\"count\":1,\"ms\":57.90899999999965},{\"group\":\"SELECT requests_config\",\"count\":3,\"ms\":10.492699999995239},{\"group\":\"SELECT employees\",\"count\":1,\"ms\":7.241800000003423},{\"group\":\"SELECT payroll_policy_versions\",\"count\":4,\"ms\":6.80269999999291}],\"sqlSumMs\":701.4633999999351}\n",
    "REVIEW_PROGRESS {\"label\":\"calculate 500\",\"elapsedSeconds\":30,\"queries\":32570}\n",
    "REVIEW_MEASURE {\"label\":\"calculate 500\",\"route\":\"/payroll/runs/1/calculate\",\"queries\":33063,\"writes\":1,\"transactions\":2,\"maxTransactionMs\":52095.341100000005,\"rssStartMiB\":594.9765625,\"peakRssMiB\":914.87890625,\"ms\":52885.0491,\"status\":201,\"responseBytes\":18306848,\"rows\":500,\"topSql\":[{\"group\":\"OTHER payroll_items\",\"count\":500,\"ms\":22800.173599999776},{\"group\":\"SELECT attendance_days\",\"count\":3500,\"ms\":3495.829599999888},{\"group\":\"SELECT employees\",\"count\":3001,\"ms\":2283.606799999914},{\"group\":\"OTHER payroll_daily_accrual\",\"count\":1000,\"ms\":2208.622800000121},{\"group\":\"SELECT attendance_exemptions\",\"count\":2500,\"ms\":1778.6306999997832},{\"group\":\"SELECT requests_config\",\"count\":2006,\"ms\":1316.505399999718},{\"group\":\"SELECT attendance_rule_versions\",\"count\":1501,\"ms\":1312.7477000000945},{\"group\":\"SELECT schedule_day_overrides\",\"count\":2000,\"ms\":1294.5847000000795}],\"sqlSumMs\":49326.78349999934}\n",
    "REVIEW_MEASURE {\"label\":\"payroll detail 500\",\"route\":\"/payroll/runs/1\",\"queries\":18,\"writes\":0,\"transactions\":1,\"maxTransactionMs\":628.8269,\"rssStartMiB\":412.24609375,\"peakRssMiB\":475.42578125,\"ms\":784.3662999999942,\"status\":200,\"responseBytes\":18306848,\"rows\":500,\"topSql\":[{\"group\":\"SELECT payroll_items\",\"count\":2,\"ms\":362.078600000008},{\"group\":\"SELECT payroll_runs\",\"count\":4,\"ms\":106.25899999999092},{\"group\":\"SELECT overtime_entries\",\"count\":1,\"ms\":47.71959999999672},{\"group\":\"SELECT payroll_period_claims\",\"count\":1,\"ms\":47.687000000005355},{\"group\":\"SELECT payroll_run_members\",\"count\":1,\"ms\":28.613100000002305},{\"group\":\"SELECT users\",\"count\":2,\"ms\":4.342799999998533},{\"group\":\"SELECT payroll_policy_versions\",\"count\":2,\"ms\":1.9956999999994878},{\"group\":\"SELECT requests_config\",\"count\":1,\"ms\":1.7232999999978347}],\"sqlSumMs\":603.2774000000063}\n",
    "REVIEW_MEASURE {\"label\":\"bank sheet 500\",\"route\":\"/payroll/runs/1/bank-sheet\",\"queries\":20,\"writes\":0,\"transactions\":1,\"maxTransactionMs\":495.2755000000034,\"rssStartMiB\":524.42578125,\"peakRssMiB\":598.19140625,\"ms\":604.1633999999904,\"status\":200,\"responseBytes\":105107,\"rows\":500,\"topSql\":[{\"group\":\"SELECT payroll_items\",\"count\":2,\"ms\":240.24189999999362},{\"group\":\"SELECT payroll_runs\",\"count\":4,\"ms\":106.8114999999816},{\"group\":\"SELECT employees\",\"count\":1,\"ms\":70.35309999999299},{\"group\":\"SELECT payroll_period_claims\",\"count\":1,\"ms\":48.085599999991246},{\"group\":\"SELECT overtime_entries\",\"count\":1,\"ms\":46.34130000000005},{\"group\":\"SELECT payroll_run_members\",\"count\":1,\"ms\":15.799800000007963},{\"group\":\"SELECT users\",\"count\":2,\"ms\":6.6111000000091735},{\"group\":\"SELECT payroll_item_disbursements\",\"count\":1,\"ms\":3.018099999986589}],\"sqlSumMs\":545.4809999999707}\n",
    "REVIEW_MEASURE {\"label\":\"financial include draft 500\",\"route\":\"/reports/financial/payroll-register?period=2026-10&includeDraft=true&branchId=1\",\"queries\":4,\"writes\":0,\"transactions\":0,\"maxTransactionMs\":0,\"rssStartMiB\":503.6640625,\"peakRssMiB\":520.2890625,\"ms\":1324.117299999998,\"status\":200,\"responseBytes\":402736,\"rows\":500,\"topSql\":[{\"group\":\"SELECT payroll_items\",\"count\":1,\"ms\":1297.143499999991},{\"group\":\"SELECT users\",\"count\":1,\"ms\":2.581399999995483},{\"group\":\"SELECT requests_config\",\"count\":1,\"ms\":2.3126000000047497},{\"group\":\"SELECT other\",\"count\":1,\"ms\":1.5288000000000466}],\"sqlSumMs\":1303.5662999999913}\n",
    "REVIEW_MEASURE {\"label\":\"disbursement 500\",\"route\":\"/payroll/disbursement/runs/1\",\"queries\":6,\"writes\":0,\"transactions\":0,\"maxTransactionMs\":0,\"rssStartMiB\":821.71875,\"peakRssMiB\":850.3046875,\"ms\":533.9559000000008,\"status\":200,\"responseBytes\":246100,\"rows\":500,\"topSql\":[{\"group\":\"SELECT payroll_items\",\"count\":1,\"ms\":387.72389999999723},{\"group\":\"SELECT employees\",\"count\":1,\"ms\":59.834600000001956},{\"group\":\"SELECT payroll_run_members\",\"count\":1,\"ms\":41.117399999988265},{\"group\":\"SELECT payroll_runs\",\"count\":1,\"ms\":7.895699999993667},{\"group\":\"SELECT users\",\"count\":1,\"ms\":2.1600999999936903},{\"group\":\"SELECT payroll_item_disbursements\",\"count\":1,\"ms\":1.727599999998347}],\"sqlSumMs\":500.45929999997315}\n",
    "{\"cleanupVerified\":\"hr_codex_performance_test_5a4ad19eee8a5fa4\"}\n"
  ]
}
