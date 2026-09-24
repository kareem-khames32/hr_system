module.exports = [
  {
    "label": "real 20 September cold accrual cache OFF",
    "route": "/payroll/runs/17/calculate",
    "queries": 31256,
    "writes": 832,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 554.38671875,
    "peakRssMiB": 805.48828125,
    "ms": 29041.324099999998,
    "status": 201,
    "responseBytes": 1972928,
    "rows": 20,
    "topSql": [
      {
        "group": "SELECT attendance_rule_versions",
        "count": 6414,
        "ms": 5559.190399999994
      },
      {
        "group": "SELECT employees",
        "count": 3937,
        "ms": 2916.9233000000004
      },
      {
        "group": "OTHER payroll_daily_accrual",
        "count": 620,
        "ms": 1368.9408000000076
      },
      {
        "group": "SELECT attendance_days",
        "count": 1697,
        "ms": 1365.0622000000876
      },
      {
        "group": "SELECT requests_config",
        "count": 1895,
        "ms": 1290.6485999999677
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 1598,
        "ms": 1156.2728999999872
      },
      {
        "group": "SELECT work_schedules",
        "count": 1634,
        "ms": 1106.2226000000537
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 1554,
        "ms": 1053.3900000000322
      }
    ],
    "sqlSumMs": 25826.931600000178
  },
  {
    "label": "real 20 September cold accrual cache ON",
    "route": "/payroll/runs/17/calculate",
    "queries": 11225,
    "writes": 832,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 803.0625,
    "peakRssMiB": 806.42578125,
    "ms": 11861.802199999998,
    "status": 201,
    "responseBytes": 1972928,
    "rows": 20,
    "topSql": [
      {
        "group": "OTHER payroll_daily_accrual",
        "count": 620,
        "ms": 1359.5224999999264
      },
      {
        "group": "SELECT attendance_days",
        "count": 1697,
        "ms": 1318.6624000001175
      },
      {
        "group": "OTHER attendance_days",
        "count": 409,
        "ms": 926.8322999999364
      },
      {
        "group": "SELECT requests",
        "count": 1121,
        "ms": 794.0772000001089
      },
      {
        "group": "SELECT overtime_entries",
        "count": 953,
        "ms": 760.5793000000558
      },
      {
        "group": "OTHER payroll_items",
        "count": 20,
        "ms": 634.2727000000159
      },
      {
        "group": "SELECT attendance_punches",
        "count": 786,
        "ms": 575.6939999999158
      },
      {
        "group": "SELECT attendance_corrections",
        "count": 786,
        "ms": 526.7443999998504
      }
    ],
    "sqlSumMs": 10504.836900000118
  }
]
