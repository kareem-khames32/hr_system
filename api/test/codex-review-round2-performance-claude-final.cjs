module.exports = [
  {
    "label": "draft 500",
    "route": "/payroll/runs",
    "queries": 537,
    "writes": 0,
    "transactions": 2,
    "maxTransactionMs": 722.5544000000009,
    "rssStartMiB": 568.234375,
    "peakRssMiB": 574.9765625,
    "ms": 756.6797999999999,
    "status": 201,
    "responseBytes": 2766,
    "rows": 0,
    "topSql": [
      {
        "group": "SELECT employee_salary_history_versions",
        "count": 500,
        "ms": 317.2036000000062
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 129.85670000000027
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 75.08879999999954
      },
      {
        "group": "SELECT offboarding_cases",
        "count": 1,
        "ms": 63.33010000000104
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 58.94930000000022
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 10.035799999999654
      },
      {
        "group": "SELECT requests_config",
        "count": 3,
        "ms": 9.766699999998309
      },
      {
        "group": "SELECT payroll_policy_versions",
        "count": 4,
        "ms": 6.433199999999488
      }
    ],
    "sqlSumMs": 708.8858000000109
  },
  {
    "label": "calculate 500",
    "route": "/payroll/runs/1/calculate",
    "queries": 33063,
    "writes": 1,
    "transactions": 2,
    "maxTransactionMs": 52532.2852,
    "rssStartMiB": 575.33203125,
    "peakRssMiB": 907.43359375,
    "ms": 53282.3094,
    "status": 201,
    "responseBytes": 18306848,
    "rows": 500,
    "topSql": [
      {
        "group": "OTHER payroll_items",
        "count": 500,
        "ms": 22969.104500000016
      },
      {
        "group": "SELECT attendance_days",
        "count": 3500,
        "ms": 3469.019099999947
      },
      {
        "group": "SELECT employees",
        "count": 3001,
        "ms": 2411.6858999999167
      },
      {
        "group": "OTHER payroll_daily_accrual",
        "count": 1000,
        "ms": 2214.8142999999945
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 2500,
        "ms": 1807.173599999809
      },
      {
        "group": "SELECT requests_config",
        "count": 2006,
        "ms": 1337.248799999972
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 1501,
        "ms": 1313.8310999999812
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 2000,
        "ms": 1273.4523000000481
      }
    ],
    "sqlSumMs": 49622.55130000005
  },
  {
    "label": "payroll detail 500",
    "route": "/payroll/runs/1",
    "queries": 18,
    "writes": 0,
    "transactions": 1,
    "maxTransactionMs": 485.9351000000024,
    "rssStartMiB": 452.98046875,
    "peakRssMiB": 453.8671875,
    "ms": 649.1877999999997,
    "status": 200,
    "responseBytes": 18306848,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 2,
        "ms": 202.62910000000556
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 117.87049999998999
      },
      {
        "group": "SELECT overtime_entries",
        "count": 1,
        "ms": 48.84739999999874
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 47.27169999999751
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 29.710599999991246
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 5.431300000011106
      },
      {
        "group": "SELECT payroll_policy_versions",
        "count": 2,
        "ms": 1.9818999999988591
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 1.7097999999969034
      }
    ],
    "sqlSumMs": 458.50879999996687
  },
  {
    "label": "bank sheet 500",
    "route": "/payroll/runs/1/bank-sheet",
    "queries": 20,
    "writes": 0,
    "transactions": 1,
    "maxTransactionMs": 430.4746000000014,
    "rssStartMiB": 507.39453125,
    "peakRssMiB": 575.296875,
    "ms": 539.2565999999933,
    "status": 200,
    "responseBytes": 105107,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 2,
        "ms": 155.21930000001157
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 106.97699999999895
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 71.02270000000135
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 50.240299999990384
      },
      {
        "group": "SELECT overtime_entries",
        "count": 1,
        "ms": 46.42160000000149
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 26.391499999997905
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 5.60559999999532
      },
      {
        "group": "SELECT payroll_item_disbursements",
        "count": 1,
        "ms": 3.353799999997136
      }
    ],
    "sqlSumMs": 472.73749999998836
  },
  {
    "label": "financial include draft 500",
    "route": "/reports/financial/payroll-register?period=2026-10&includeDraft=true&branchId=1",
    "queries": 4,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 493.83984375,
    "peakRssMiB": 511.01171875,
    "ms": 1331.715200000006,
    "status": 200,
    "responseBytes": 402736,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 1301.6506999999983
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 2.5733000000036554
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 2.275599999993574
      },
      {
        "group": "SELECT other",
        "count": 1,
        "ms": 1.7659999999887077
      }
    ],
    "sqlSumMs": 1308.2655999999843
  },
  {
    "label": "disbursement 500",
    "route": "/payroll/disbursement/runs/1",
    "queries": 6,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 1183.11328125,
    "peakRssMiB": 1199.984375,
    "ms": 461.2639999999956,
    "status": 200,
    "responseBytes": 246100,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 295.18189999999595
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 51.08750000000873
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 44.371999999988475
      },
      {
        "group": "SELECT payroll_runs",
        "count": 1,
        "ms": 29.65539999998873
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 2.913300000000163
      },
      {
        "group": "SELECT payroll_item_disbursements",
        "count": 1,
        "ms": 2.321700000000419
      }
    ],
    "sqlSumMs": 425.53179999998247
  }
]
