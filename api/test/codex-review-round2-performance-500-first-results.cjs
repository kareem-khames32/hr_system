module.exports = [
  {
    "label": "draft 500",
    "route": "/payroll/runs",
    "queries": 537,
    "writes": 0,
    "transactions": 2,
    "maxTransactionMs": 1702.5188999999991,
    "rssStartMiB": 552.3359375,
    "peakRssMiB": 562.08203125,
    "ms": 1886.992900000001,
    "status": 201,
    "responseBytes": 2766,
    "rows": 0,
    "topSql": [
      {
        "group": "SELECT employee_salary_history_versions",
        "count": 500,
        "ms": 1028.872400000033
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 205.79320000000007
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 112.82120000000214
      },
      {
        "group": "SELECT payroll_policy_versions",
        "count": 4,
        "ms": 105.5076999999983
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 77.74889999999868
      },
      {
        "group": "SELECT offboarding_cases",
        "count": 1,
        "ms": 66.63409999999931
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 58.99699999999939
      },
      {
        "group": "SELECT requests_config",
        "count": 3,
        "ms": 37.105799999997544
      }
    ],
    "sqlSumMs": 1797.086000000032
  },
  {
    "label": "calculate 500",
    "route": "/payroll/runs/1/calculate",
    "queries": 41044,
    "writes": 1,
    "transactions": 1,
    "maxTransactionMs": 0,
    "rssStartMiB": 562.08203125,
    "peakRssMiB": 780.328125,
    "ms": 517194.77,
    "status": 500,
    "responseBytes": 52,
    "rows": null,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 5501,
        "ms": 190763.21479999935
      },
      {
        "group": "SELECT attendance_days",
        "count": 3500,
        "ms": 119919.7202999991
      },
      {
        "group": "OTHER payroll_daily_accrual",
        "count": 1000,
        "ms": 49450.48859999933
      },
      {
        "group": "SELECT employee_obligations",
        "count": 1000,
        "ms": 24233.84770000108
      },
      {
        "group": "SELECT payroll_financial_exemptions",
        "count": 500,
        "ms": 23466.777499999866
      },
      {
        "group": "SELECT payroll_daily_accrual",
        "count": 500,
        "ms": 23421.01279999948
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 3001,
        "ms": 9091.166500000429
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 2500,
        "ms": 7271.176400000462
      }
    ],
    "sqlSumMs": 506606.22449999326
  }
]
