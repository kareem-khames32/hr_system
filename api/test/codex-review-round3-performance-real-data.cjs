module.exports = [
  {
    "label": "daily copied latest round 1",
    "route": "/attendance/daily?date=2026-09-22",
    "queries": 552,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 556.00390625,
    "peakRssMiB": 562.6953125,
    "ms": 588.3868999999995,
    "status": 200,
    "responseBytes": 5462,
    "rows": 4,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 485,
        "ms": 4080.9124999999804
      },
      {
        "group": "SELECT employees",
        "count": 10,
        "ms": 73.59040000000277
      },
      {
        "group": "SELECT attendance_days",
        "count": 8,
        "ms": 35.08229999999821
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 14,
        "ms": 32.80709999999635
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 29.472999999998137
      },
      {
        "group": "SELECT attendance_punches",
        "count": 3,
        "ms": 22.53110000000197
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 6,
        "ms": 12.443599999996877
      },
      {
        "group": "SELECT requests",
        "count": 3,
        "ms": 11.879099999998289
      }
    ],
    "sqlSumMs": 4356.692699999972
  },
  {
    "label": "daily copied latest round 2",
    "route": "/attendance/daily?date=2026-09-22",
    "queries": 552,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 563.3515625,
    "peakRssMiB": 576.74609375,
    "ms": 376.0012999999999,
    "status": 200,
    "responseBytes": 5462,
    "rows": 4,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 485,
        "ms": 3365.0435000000016
      },
      {
        "group": "SELECT employees",
        "count": 10,
        "ms": 36.914899999994304
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 14,
        "ms": 17.877999999998792
      },
      {
        "group": "SELECT attendance_days",
        "count": 8,
        "ms": 14.607100000001083
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 6,
        "ms": 7.370299999998679
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 4.936800000001313
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 4.695099999999002
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 3,
        "ms": 3.883899999998903
      }
    ],
    "sqlSumMs": 3479.7465999999913
  },
  {
    "label": "daily copied latest round 3",
    "route": "/attendance/daily?date=2026-09-22",
    "queries": 552,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 576.80859375,
    "peakRssMiB": 592.18359375,
    "ms": 404.1801999999989,
    "status": 200,
    "responseBytes": 5462,
    "rows": 4,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 485,
        "ms": 4233.902099999974
      },
      {
        "group": "SELECT employees",
        "count": 10,
        "ms": 22.82970000000205
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 14,
        "ms": 18.756500000001324
      },
      {
        "group": "SELECT attendance_days",
        "count": 8,
        "ms": 14.882899999998699
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 6,
        "ms": 8.334200000002966
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 5.340300000001662
      },
      {
        "group": "SELECT attendance_corrections",
        "count": 3,
        "ms": 4.3672999999998865
      },
      {
        "group": "SELECT leaves",
        "count": 3,
        "ms": 4.350199999998949
      }
    ],
    "sqlSumMs": 4339.111699999981
  },
  {
    "label": "daily copied maximum stored rows",
    "route": "/attendance/daily?date=2026-08-31",
    "queries": 9577,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 592.19140625,
    "peakRssMiB": 772.859375,
    "ms": 12982.279400000001,
    "status": 200,
    "responseBytes": 1314707,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 1007,
        "ms": 5312.116700000002
      },
      {
        "group": "SELECT employees",
        "count": 1489,
        "ms": 1976.7094000000343
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 1499,
        "ms": 1879.4899999999907
      },
      {
        "group": "SELECT attendance_days",
        "count": 997,
        "ms": 1371.057399999996
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 992,
        "ms": 1232.5977999999704
      },
      {
        "group": "SELECT requests",
        "count": 987,
        "ms": 1203.3965000000007
      },
      {
        "group": "SELECT attendance_punches",
        "count": 497,
        "ms": 760.7875000000622
      },
      {
        "group": "SELECT payroll_runs",
        "count": 500,
        "ms": 676.1213000000116
      }
    ],
    "sqlSumMs": 16367.003500000015
  },
  {
    "label": "daily 500 cache OFF packet unchanged",
    "route": "/attendance/daily?date=2026-08-31",
    "queries": 18454,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 715.3984375,
    "peakRssMiB": 816.21484375,
    "ms": 24743.037800000002,
    "status": 200,
    "responseBytes": 1314707,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT attendance_rule_versions",
        "count": 4271,
        "ms": 5492.823399999736
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 1007,
        "ms": 4111.951599999902
      },
      {
        "group": "SELECT employees",
        "count": 2481,
        "ms": 3270.8068000001185
      },
      {
        "group": "SELECT work_schedules",
        "count": 1279,
        "ms": 1522.7179000000688
      },
      {
        "group": "SELECT attendance_days",
        "count": 997,
        "ms": 1386.6851000000825
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 992,
        "ms": 1316.2907999998897
      },
      {
        "group": "SELECT requests",
        "count": 987,
        "ms": 1232.2020999999004
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 992,
        "ms": 1181.262300000013
      }
    ],
    "sqlSumMs": 26230.604699999483
  },
  {
    "label": "daily original 88 second scenario",
    "route": "/attendance/daily?date=2026-09-15",
    "queries": 5191,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 791.16796875,
    "peakRssMiB": 813.87890625,
    "ms": 6860.279699999999,
    "status": 200,
    "responseBytes": 719968,
    "rows": 273,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 617,
        "ms": 2607.7207999999737
      },
      {
        "group": "SELECT employees",
        "count": 802,
        "ms": 1132.9847999999765
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 808,
        "ms": 1063.758900000008
      },
      {
        "group": "SELECT attendance_days",
        "count": 541,
        "ms": 793.8654000000752
      },
      {
        "group": "SELECT requests",
        "count": 532,
        "ms": 642.1306000000914
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 534,
        "ms": 617.8265999999858
      },
      {
        "group": "SELECT attendance_punches",
        "count": 268,
        "ms": 348.5734999999768
      },
      {
        "group": "SELECT payroll_runs",
        "count": 273,
        "ms": 340.3411000000342
      }
    ],
    "sqlSumMs": 8496.800299999966
  },
  {
    "label": "daily branch10 cache OFF packet unchanged",
    "route": "/attendance/daily?date=2026-09-15",
    "queries": 9566,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 734.73828125,
    "peakRssMiB": 803.1875,
    "ms": 12333.263599999998,
    "status": 200,
    "responseBytes": 719968,
    "rows": 273,
    "topSql": [
      {
        "group": "SELECT attendance_rule_versions",
        "count": 1965,
        "ms": 2455.220299999957
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 617,
        "ms": 2430.0406999998813
      },
      {
        "group": "SELECT employees",
        "count": 1336,
        "ms": 1749.183800000028
      },
      {
        "group": "SELECT requests_config",
        "count": 733,
        "ms": 847.9076999999525
      },
      {
        "group": "SELECT attendance_days",
        "count": 541,
        "ms": 718.8194999999541
      },
      {
        "group": "SELECT requests",
        "count": 532,
        "ms": 666.0714999999764
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 534,
        "ms": 620.6534999999421
      },
      {
        "group": "SELECT weekly_schedule_entries",
        "count": 534,
        "ms": 613.1727000000537
      }
    ],
    "sqlSumMs": 13430.246999999647
  },
  {
    "label": "daily copied today",
    "route": "/attendance/daily?date=2026-09-24",
    "queries": 9170,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 792.515625,
    "peakRssMiB": 807.65234375,
    "ms": 4999.8735000000015,
    "status": 200,
    "responseBytes": 2788,
    "rows": 3,
    "topSql": [
      {
        "group": "SELECT attendance_rule_versions",
        "count": 2903,
        "ms": 29556.32989999978
      },
      {
        "group": "SELECT employees",
        "count": 1451,
        "ms": 15133.957700000305
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 963,
        "ms": 11260.754700000005
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 969,
        "ms": 6945.670899999866
      },
      {
        "group": "SELECT requests_config",
        "count": 481,
        "ms": 5012.055100000041
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 486,
        "ms": 4825.197899999985
      },
      {
        "group": "SELECT public_holidays",
        "count": 481,
        "ms": 4660.65949999982
      },
      {
        "group": "SELECT work_schedules",
        "count": 484,
        "ms": 4514.09960000006
      }
    ],
    "sqlSumMs": 90302.42199999977
  },
  {
    "label": "employees copied 616",
    "route": "/employees",
    "queries": 4,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 627.7109375,
    "peakRssMiB": 629.51171875,
    "ms": 55.26949999999488,
    "status": 200,
    "responseBytes": 1122479,
    "rows": 616,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 21.047200000000885
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 1,
        "ms": 9.513800000000629
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 2.0115999999979977
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 1.7445000000006985
      }
    ],
    "sqlSumMs": 34.31710000000021
  },
  {
    "label": "attendance report copied September",
    "route": "/reports/attendance?month=2026-09",
    "queries": 2,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 641.390625,
    "peakRssMiB": 0,
    "ms": 16.25800000000163,
    "status": 200,
    "responseBytes": 137692,
    "rows": 527,
    "topSql": [
      {
        "group": "SELECT attendance_days",
        "count": 1,
        "ms": 10.34100000000035
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 2.6383000000059837
      }
    ],
    "sqlSumMs": 12.979300000006333
  },
  {
    "label": "headcount copied 616",
    "route": "/reports/headcount",
    "queries": 3,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 642.70703125,
    "peakRssMiB": 0,
    "ms": 15.686100000006263,
    "status": 200,
    "responseBytes": 1759,
    "rows": null,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 10.39419999999518
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 1.9563000000052853
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 1.4703000000008615
      }
    ],
    "sqlSumMs": 13.820800000001327
  },
  {
    "label": "financial copied September",
    "route": "/reports/financial/payroll-register?period=2026-09",
    "queries": 5,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 642.85546875,
    "peakRssMiB": 642.88671875,
    "ms": 157.52490000000398,
    "status": 200,
    "responseBytes": 11260,
    "rows": 7,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 139.93589999999676
      },
      {
        "group": "SELECT employee_obligations",
        "count": 1,
        "ms": 3.8387000000075204
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 2.26589999999851
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 1.3901999999943655
      },
      {
        "group": "SELECT other",
        "count": 1,
        "ms": 1.3429999999934807
      }
    ],
    "sqlSumMs": 148.77369999999064
  },
  {
    "label": "payroll list copied",
    "route": "/payroll/runs",
    "queries": 2,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 643.05859375,
    "peakRssMiB": 643.875,
    "ms": 37.26980000000913,
    "status": 200,
    "responseBytes": 16828,
    "rows": 16,
    "topSql": [
      {
        "group": "SELECT payroll_runs",
        "count": 1,
        "ms": 32.97490000000107
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 1.826600000000326
      }
    ],
    "sqlSumMs": 34.8015000000014
  }
]
