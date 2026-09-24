module.exports = [
  {
    "label": "draft 500",
    "route": "/payroll/runs",
    "queries": 537,
    "writes": 0,
    "transactions": 2,
    "maxTransactionMs": 2469.027200000004,
    "rssStartMiB": 566.35546875,
    "peakRssMiB": 572.90234375,
    "ms": 2646.2255000000005,
    "status": 201,
    "responseBytes": 2766,
    "rows": 0,
    "topSql": [
      {
        "group": "SELECT employee_salary_history_versions",
        "count": 500,
        "ms": 1368.5306000000783
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 335.6316000000079
      },
      {
        "group": "SELECT employee_suspensions",
        "count": 1,
        "ms": 162.4817000000039
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 155.95249999999942
      },
      {
        "group": "SELECT offboarding_cases",
        "count": 1,
        "ms": 121.59130000000005
      },
      {
        "group": "SELECT requests_config",
        "count": 3,
        "ms": 43.95270000000164
      },
      {
        "group": "SELECT payroll_policy_versions",
        "count": 4,
        "ms": 35.47419999999693
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 35.220100000005914
      }
    ],
    "sqlSumMs": 2419.574300000095
  },
  {
    "label": "calculate 500",
    "route": "/payroll/runs/1/calculate",
    "queries": 41563,
    "writes": 1,
    "transactions": 2,
    "maxTransactionMs": 171769.5211,
    "rssStartMiB": 572.96875,
    "peakRssMiB": 952.8828125,
    "ms": 173676.546,
    "status": 201,
    "responseBytes": 18306848,
    "rows": 500,
    "topSql": [
      {
        "group": "OTHER payroll_items",
        "count": 500,
        "ms": 26633.261000000115
      },
      {
        "group": "SELECT employees",
        "count": 5501,
        "ms": 17307.612000000852
      },
      {
        "group": "SELECT attendance_days",
        "count": 3500,
        "ms": 13902.989500000382
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 3001,
        "ms": 9143.966800000722
      },
      {
        "group": "SELECT requests_config",
        "count": 3006,
        "ms": 8238.485399999256
      },
      {
        "group": "OTHER payroll_daily_accrual",
        "count": 1000,
        "ms": 7793.596299999728
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 2500,
        "ms": 7545.770499999948
      },
      {
        "group": "SELECT weekly_schedule_entries",
        "count": 2500,
        "ms": 6653.046100000043
      }
    ],
    "sqlSumMs": 156452.4854000021
  },
  {
    "label": "payroll detail 500",
    "route": "/payroll/runs/1",
    "queries": 18,
    "writes": 0,
    "transactions": 1,
    "maxTransactionMs": 926.8144000000029,
    "rssStartMiB": 840.58984375,
    "peakRssMiB": 908.78125,
    "ms": 1342.2032999999938,
    "status": 200,
    "responseBytes": 18306848,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 2,
        "ms": 433.3258999999962
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 149.39590000000317
      },
      {
        "group": "SELECT overtime_entries",
        "count": 1,
        "ms": 67.46860000002198
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 63.70590000000084
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 62.37849999999162
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 18.551199999987148
      },
      {
        "group": "SELECT payroll_policy_versions",
        "count": 2,
        "ms": 9.315299999987474
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 6.829700000002049
      }
    ],
    "sqlSumMs": 828.7485999999626
  },
  {
    "label": "bank sheet 500",
    "route": "/payroll/runs/1/bank-sheet",
    "queries": 20,
    "writes": 0,
    "transactions": 1,
    "maxTransactionMs": 887.3244999999879,
    "rssStartMiB": 880.4140625,
    "peakRssMiB": 908.1484375,
    "ms": 1155.4633999999787,
    "status": 200,
    "responseBytes": 105107,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 2,
        "ms": 461.48120000000927
      },
      {
        "group": "SELECT payroll_runs",
        "count": 4,
        "ms": 139.05770000000484
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 120.97179999999935
      },
      {
        "group": "SELECT overtime_entries",
        "count": 1,
        "ms": 59.32780000002822
      },
      {
        "group": "SELECT payroll_period_claims",
        "count": 1,
        "ms": 58.63819999998668
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 36.328899999993155
      },
      {
        "group": "SELECT users",
        "count": 2,
        "ms": 18.06830000001355
      },
      {
        "group": "SELECT payroll_item_disbursements",
        "count": 1,
        "ms": 11.15559999999823
      }
    ],
    "sqlSumMs": 933.5537000000477
  },
  {
    "label": "financial include draft 500",
    "route": "/reports/financial/payroll-register?period=2026-10&includeDraft=true&branchId=1",
    "queries": 4,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 784.05859375,
    "peakRssMiB": 785.09375,
    "ms": 3563.3559999999998,
    "status": 200,
    "responseBytes": 402736,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 3445.512400000007
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 8.059100000013132
      },
      {
        "group": "SELECT requests_config",
        "count": 1,
        "ms": 7.467999999993481
      },
      {
        "group": "SELECT other",
        "count": 1,
        "ms": 6.04069999998319
      }
    ],
    "sqlSumMs": 3467.0801999999967
  },
  {
    "label": "disbursement 500",
    "route": "/payroll/disbursement/runs/1",
    "queries": 6,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 905.0703125,
    "peakRssMiB": 928.3671875,
    "ms": 808.9245000000228,
    "status": 200,
    "responseBytes": 246100,
    "rows": 500,
    "topSql": [
      {
        "group": "SELECT payroll_items",
        "count": 1,
        "ms": 476.6550999999745
      },
      {
        "group": "SELECT employees",
        "count": 1,
        "ms": 107.04840000002878
      },
      {
        "group": "SELECT payroll_run_members",
        "count": 1,
        "ms": 56.93170000001555
      },
      {
        "group": "SELECT payroll_runs",
        "count": 1,
        "ms": 25.534299999999348
      },
      {
        "group": "SELECT users",
        "count": 1,
        "ms": 7.827899999974761
      },
      {
        "group": "SELECT payroll_item_disbursements",
        "count": 1,
        "ms": 6.765600000042468
      }
    ],
    "sqlSumMs": 680.7630000000354
  }
]
