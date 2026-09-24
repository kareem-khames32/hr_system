module.exports = [
  {
    "label": "draft 500",
    "route": "/payroll/runs",
    "queries": 537,
    "writes": 0,
    "transactions": 2,
    "maxTransactionMs": 757.2278999999999,
    "rssStartMiB": 568.76171875,
    "peakRssMiB": 574.98046875,
    "ms": 796.2376000000004,
    "status": 201,
    "responseBytes": 2766,
    "rows": 0,
    "topSql": [
      {
        "group": "SELECT employee_salary_history_versions",
        "count": 500,
        "ms": 335.9569999999876
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 127.08309999999801
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 73.80949999999939
      },
      {
        "group": "SELECT offboarding_cases",
        "count": 1,
        "ms": 64.1330999999991
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 57.267400000000634
      },
      {
        "group": "SELECT requests_config",
        "count": 3,
        "ms": 10.703299999999217
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 7.982299999999668
      },
      {
        "group": "SELECT payroll_policy_versions",
        "count": 4,
        "ms": 6.205400000000736
      }
    ],
    "sqlSumMs": 720.8624999999884
  },
  {
    "label": "calculate 500",
    "route": "/payroll/runs/1/calculate",
    "queries": 133063,
    "writes": 1,
    "transactions": 2,
    "maxTransactionMs": 152208.2773,
    "rssStartMiB": 575.06640625,
    "peakRssMiB": 969.796875,
    "ms": 152989.56079999998,
    "status": 201,
    "responseBytes": 18306848,
    "rows": 500,
    "topSql": [
      {
        "group": "OTHER payroll_daily_accrual",
        "count": 15000,
        "ms": 29577.413400000216
      },
      {
        "group": "OTHER payroll_items",
        "count": 500,
        "ms": 22787.129400000034
      },
      {
        "group": "SELECT attendance_days",
        "count": 17500,
        "ms": 18403.360199999694
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 16500,
        "ms": 10913.583199999164
      },
      {
        "group": "SELECT attendance_corrections",
        "count": 15500,
        "ms": 9944.118800000313
      },
      {
        "group": "SELECT attendance_punches",
        "count": 15500,
        "ms": 9938.16449999954
      },
      {
        "group": "SELECT payroll_runs",
        "count": 15010,
        "ms": 9876.696599999956
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 16000,
        "ms": 9856.981900001309
      }
    ],
    "sqlSumMs": 139940.27640000006
  },
  {
    "label": "payroll detail 500",
    "route": "/payroll/runs/1",
    "queries": 18,
    "writes": 0,
    "transactions": 1,
    "maxTransactionMs": 474.3392000000167,
    "rssStartMiB": 848.97265625,
    "peakRssMiB": 880.50390625,
    "ms": 619.1559000000125,
    "status": 200,
    "responseBytes": 18306848,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 2,
        "ms": 191.0127999999968
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 104.93670000002021
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 48.80360000001383
      },
      {
        "group": "SELECT overtime_entries",
        "count": 1,
        "ms": 46.02379999999539
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 37.49719999998342
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 6.399299999990035
      },
      {
        "group": "SELECT payroll_policy_versions",
        "count": 2,
        "ms": 2.432799999980489
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 1.9223000000056345
      }
    ],
    "sqlSumMs": 442.48499999998603
  },
  {
    "label": "bank sheet 500",
    "route": "/payroll/runs/1/bank-sheet",
    "queries": 20,
    "writes": 0,
    "transactions": 1,
    "maxTransactionMs": 459.4965000000084,
    "rssStartMiB": 795.5234375,
    "peakRssMiB": 827.09375,
    "ms": 571.7205000000249,
    "status": 200,
    "responseBytes": 105107,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 2,
        "ms": 185.57130000001052
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 101.13989999998012
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 69.94530000002123
      },
      {
        "group": "SELECT overtime_entries",
        "count": 1,
        "ms": 46.70889999999781
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 46.14220000000205
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 30.191900000005262
      },
      {
        "group": "SELECT payroll_item_disbursements",
        "count": 1,
        "ms": 5.154199999989942
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 3.3225000000093132
      }
    ],
    "sqlSumMs": 494.0957000000053
  },
  {
    "label": "financial include draft 500",
    "route": "/reports/financial/payroll-register?period=2026-07&includeDraft=true&branchId=1",
    "queries": 4,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 793.41796875,
    "peakRssMiB": 793.43359375,
    "ms": 1334.8269999999902,
    "status": 200,
    "responseBytes": 402736,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 1307.2208999999857
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 2.633400000020629
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 2.113099999987753
      },
      {
        "group": "SELECT other",
        "count": 1,
        "ms": 2.0341999999945983
      }
    ],
    "sqlSumMs": 1314.0015999999887
  },
  {
    "label": "approve 500 including acknowledgements",
    "route": "fixture.approve including prerequisite acknowledgements",
    "queries": 274640,
    "writes": 2,
    "transactions": 7,
    "maxTransactionMs": 196415.005,
    "rssStartMiB": 790.49609375,
    "peakRssMiB": 1250.96484375,
    "ms": 198350.5428,
    "status": 200,
    "responseBytes": 1996190,
    "rows": null,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 45504,
        "ms": 32257.313299993868
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 30004,
        "ms": 19527.88830000264
      },
      {
        "group": "SELECT requests_config",
        "count": 30004,
        "ms": 19359.52030000079
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 30000,
        "ms": 18434.839100006648
      },
      {
        "group": "SELECT weekly_schedule_entries",
        "count": 30000,
        "ms": 18043.045799994696
      },
      {
        "group": "SELECT work_schedules",
        "count": 30000,
        "ms": 17715.865999998787
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 16000,
        "ms": 11497.317899996735
      },
      {
        "group": "SELECT attendance_days",
        "count": 15500,
        "ms": 11342.24270000108
      }
    ],
    "sqlSumMs": 179924.12049999795
  },
  {
    "label": "disbursement 500",
    "route": "/payroll/disbursement/runs/1",
    "queries": 6,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 1236.41796875,
    "peakRssMiB": 1247.5546875,
    "ms": 410.5734999999986,
    "status": 200,
    "responseBytes": 246100,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 252.16680000000633
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 52.07730000000447
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 51.133299999986775
      },
      {
        "group": "SELECT payroll_runs",
        "count": 1,
        "ms": 13.726000000024214
      },
      {
        "group": "SELECT payroll_item_disbursements",
        "count": 1,
        "ms": 2.5856999999959953
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 2.528200000000652
      }
    ],
    "sqlSumMs": 374.21730000001844
  },
  {
    "label": "pay 500",
    "route": "/payroll/runs/1/pay",
    "queries": 2514,
    "writes": 501,
    "transactions": 1,
    "maxTransactionMs": 2434.443900000013,
    "rssStartMiB": 964.0703125,
    "peakRssMiB": 1044.04296875,
    "ms": 2455.0615000000107,
    "status": 201,
    "responseBytes": 1996236,
    "rows": null,
    "topSql": [
      {
        "group": "SELECT attendance_exemptions",
        "count": 500,
        "ms": 353.3131999995676
      },
      {
        "group": "OTHER other",
        "count": 501,
        "ms": 341.2957999998471
      },
      {
        "group": "SELECT offboarding_cases",
        "count": 500,
        "ms": 328.3363000000827
      },
      {
        "group": "SELECT loan_installments",
        "count": 500,
        "ms": 318.52049999986775
      },
      {
        "group": "UPDATE payroll_items",
        "count": 500,
        "ms": 258.44079999957466
      },
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 196.8389999999781
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 2,
        "ms": 151.93560000002617
      },
      {
        "group": "SELECT payroll_runs",
        "count": 3,
        "ms": 99.13479999999981
      }
    ],
    "sqlSumMs": 2163.0757999988273
  },
  {
    "label": "paid bank sheet 500",
    "route": "/payroll/runs/1/bank-sheet",
    "queries": 19,
    "writes": 0,
    "transactions": 1,
    "maxTransactionMs": 580.8844999999856,
    "rssStartMiB": 996.49609375,
    "peakRssMiB": 1020.90625,
    "ms": 661.5901999999769,
    "status": 200,
    "responseBytes": 105101,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 200.2375999999931
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 194.2542999999714
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 48.787500000034925
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 48.42119999998249
      },
      {
        "group": "SELECT overtime_entries",
        "count": 1,
        "ms": 45.64390000002459
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 44.820200000016484
      },
      {
        "group": "SELECT payroll_run_parity_explanations",
        "count": 1,
        "ms": 15.23599999997532
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 5.679899999988265
      }
    ],
    "sqlSumMs": 611.1577000001562
  },
  {
    "label": "paid financial 500",
    "route": "/reports/financial/payroll-register?period=2026-07&branchId=1",
    "queries": 4,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 968.95703125,
    "peakRssMiB": 968.75390625,
    "ms": 1279.52290000004,
    "status": 200,
    "responseBytes": 399731,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 1248.2376999999979
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 10.019599999999627
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 1.90580000000773
      },
      {
        "group": "SELECT other",
        "count": 1,
        "ms": 1.3940999999758787
      }
    ],
    "sqlSumMs": 1261.557199999981
  },
  {
    "label": "paid disbursement 500",
    "route": "/payroll/disbursement/runs/1",
    "queries": 7,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 971.27734375,
    "peakRssMiB": 1013.40625,
    "ms": 243.55609999998705,
    "status": 200,
    "responseBytes": 247750,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 122.88349999999627
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 50.92240000003949
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 21.238100000016857
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 8.573899999959394
      },
      {
        "group": "SELECT payroll_runs",
        "count": 1,
        "ms": 6.4364000000059605
      },
      {
        "group": "SELECT payroll_item_disbursements",
        "count": 1,
        "ms": 1.838400000007823
      }
    ],
    "sqlSumMs": 211.8927000000258
  }
]
