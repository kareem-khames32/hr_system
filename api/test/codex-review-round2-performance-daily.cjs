module.exports = [
  {
    "label": "daily copied latest round 1",
    "route": "/attendance/daily?date=2026-09-22",
    "queries": 589,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 216.3515625,
    "peakRssMiB": 269.82421875,
    "ms": 2630.8019999999997,
    "status": 200,
    "responseBytes": 5462,
    "rows": 4,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 485,
        "ms": 7269.02020000001
      },
      {
        "group": "SELECT employees",
        "count": 16,
        "ms": 733.6763000000028
      },
      {
        "group": "SELECT attendance_days",
        "count": 8,
        "ms": 457.0118000000002
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 27,
        "ms": 183.76179999999295
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 165.9323000000004
      },
      {
        "group": "SELECT requests",
        "count": 3,
        "ms": 65.68929999999818
      },
      {
        "group": "SELECT attendance_punches",
        "count": 3,
        "ms": 59.08439999999973
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 6,
        "ms": 54.97529999999824
      }
    ],
    "sqlSumMs": 9300.855599999999
  },
  {
    "label": "daily copied latest round 2",
    "route": "/attendance/daily?date=2026-09-22",
    "queries": 589,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 269.93359375,
    "peakRssMiB": 323.85546875,
    "ms": 1961.773000000001,
    "status": 200,
    "responseBytes": 5462,
    "rows": 4,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 485,
        "ms": 5944.449799999977
      },
      {
        "group": "SELECT employees",
        "count": 16,
        "ms": 684.2168999999958
      },
      {
        "group": "SELECT attendance_days",
        "count": 8,
        "ms": 395.60929999999644
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 27,
        "ms": 127.53339999998934
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 6,
        "ms": 25.848399999998946
      },
      {
        "group": "SELECT weekly_schedule_entries",
        "count": 6,
        "ms": 25.10859999999957
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 6,
        "ms": 24.836100000000442
      },
      {
        "group": "SELECT shifts",
        "count": 6,
        "ms": 23.90089999999691
      }
    ],
    "sqlSumMs": 7382.854199999951
  },
  {
    "label": "daily copied latest round 3",
    "route": "/attendance/daily?date=2026-09-22",
    "queries": 589,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 323.86328125,
    "peakRssMiB": 359.2734375,
    "ms": 1981.829600000001,
    "status": 200,
    "responseBytes": 5462,
    "rows": 4,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 485,
        "ms": 6575.386999999955
      },
      {
        "group": "SELECT employees",
        "count": 16,
        "ms": 684.3304999999964
      },
      {
        "group": "SELECT attendance_days",
        "count": 8,
        "ms": 394.5954000000056
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 27,
        "ms": 126.25540000000183
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 6,
        "ms": 28.22819999999774
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 6,
        "ms": 27.473100000002887
      },
      {
        "group": "SELECT requests_config",
        "count": 3,
        "ms": 26.548399999996036
      },
      {
        "group": "SELECT shifts",
        "count": 6,
        "ms": 25.96929999999702
      }
    ],
    "sqlSumMs": 8035.79099999995
  },
  {
    "label": "daily copied maximum stored rows",
    "route": "/attendance/daily?date=2026-08-31",
    "queries": 18456,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 359.29296875,
    "peakRssMiB": 732.08203125,
    "ms": 223232.8461,
    "status": 200,
    "responseBytes": 1314707,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 2481,
        "ms": 99602.47509999902
      },
      {
        "group": "SELECT attendance_days",
        "count": 997,
        "ms": 49109.30479999988
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 4271,
        "ms": 21074.019599999945
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 1007,
        "ms": 8896.934700000318
      },
      {
        "group": "SELECT work_schedules",
        "count": 1279,
        "ms": 5756.490999999929
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 992,
        "ms": 4837.102199999827
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 992,
        "ms": 4690.2078999995065
      },
      {
        "group": "SELECT weekly_schedule_entries",
        "count": 992,
        "ms": 4577.107099999979
      }
    ],
    "sqlSumMs": 223929.64169999846
  },
  {
    "label": "daily copied today",
    "route": "/attendance/daily?date=2026-09-24",
    "queries": 9207,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 559.984375,
    "peakRssMiB": 743,
    "ms": 14329.4479,
    "status": 200,
    "responseBytes": 2788,
    "rows": 3,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 1457,
        "ms": 92624.12459999978
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 2916,
        "ms": 66752.12839999949
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 966,
        "ms": 18630.64099999977
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 969,
        "ms": 11078.792900000495
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 486,
        "ms": 9501.076400000456
      },
      {
        "group": "SELECT public_holidays",
        "count": 483,
        "ms": 9123.031399999803
      },
      {
        "group": "SELECT branches",
        "count": 483,
        "ms": 9081.117700000235
      },
      {
        "group": "SELECT work_schedules",
        "count": 486,
        "ms": 9054.767299999774
      }
    ],
    "sqlSumMs": 243147.98079999955
  },
  {
    "label": "employees copied 616",
    "route": "/employees",
    "queries": 4,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 589,
    "peakRssMiB": 592.58203125,
    "ms": 159.4189999999944,
    "status": 200,
    "responseBytes": 1122479,
    "rows": 616,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 86.09909999999218
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 1,
        "ms": 27.641800000041258
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 6.28070000000298
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 4.659199999994598
      }
    ],
    "sqlSumMs": 124.68080000003101
  },
  {
    "label": "attendance report copied September",
    "route": "/reports/attendance?month=2026-09",
    "queries": 2,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 603.453125,
    "peakRssMiB": 0,
    "ms": 37.23449999996228,
    "status": 200,
    "responseBytes": 137692,
    "rows": 527,
    "topSql": [
      {
        "group": "SELECT attendance_days",
        "count": 1,
        "ms": 22.208500000007916
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 7.217700000037439
      }
    ],
    "sqlSumMs": 29.426200000045355
  },
  {
    "label": "headcount copied 616",
    "route": "/reports/headcount",
    "queries": 3,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 604.32421875,
    "peakRssMiB": 604.32421875,
    "ms": 55.44239999999991,
    "status": 200,
    "responseBytes": 1759,
    "rows": null,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 40.461999999999534
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 6.870400000014342
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 4.897400000016205
      }
    ],
    "sqlSumMs": 52.22980000003008
  },
  {
    "label": "financial copied September",
    "route": "/reports/financial/payroll-register?period=2026-09",
    "queries": 5,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 604.33984375,
    "peakRssMiB": 604.55859375,
    "ms": 297.40340000001015,
    "status": 200,
    "responseBytes": 11260,
    "rows": 7,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 264.0893999999971
      },
      {
        "group": "SELECT employee_obligations",
        "count": 1,
        "ms": 7.011899999983143
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 5.693900000012945
      },
      {
        "group": "SELECT other",
        "count": 1,
        "ms": 5.597599999979138
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 3.8007000000216067
      }
    ],
    "sqlSumMs": 286.19349999999395
  },
  {
    "label": "payroll list copied",
    "route": "/payroll/runs",
    "queries": 2,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 604.65234375,
    "peakRssMiB": 604.6796875,
    "ms": 39.412899999995716,
    "status": 200,
    "responseBytes": 16828,
    "rows": 16,
    "topSql": [
      {
        "group": "SELECT payroll_runs",
        "count": 1,
        "ms": 27.57719999999972
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 5.646400000026915
      }
    ],
    "sqlSumMs": 33.223600000026636
  }
]
