module.exports = [
  {
    "label": "daily original 88 second scenario",
    "route": "/attendance/daily?date=2026-09-15",
    "queries": 9566,
    "writes": 0,
    "transactions": 0,
    "maxTransactionMs": 0,
    "rssStartMiB": 238.96484375,
    "peakRssMiB": 679.625,
    "ms": 122510.74829999999,
    "status": 200,
    "responseBytes": 719968,
    "rows": 273,
    "topSql": [
      {
        "group": "SELECT employees",
        "count": 1336,
        "ms": 54211.34710000004
      },
      {
        "group": "SELECT attendance_days",
        "count": 541,
        "ms": 26842.993400000018
      },
      {
        "group": "SELECT attendance_rule_versions",
        "count": 1965,
        "ms": 10513.839000000167
      },
      {
        "group": "SELECT attendance_exemptions",
        "count": 617,
        "ms": 7278.255000000016
      },
      {
        "group": "SELECT requests_config",
        "count": 733,
        "ms": 3583.5665999999037
      },
      {
        "group": "SELECT schedule_day_overrides",
        "count": 534,
        "ms": 2880.591199999868
      },
      {
        "group": "SELECT schedule_exception_rules",
        "count": 534,
        "ms": 2751.002900000014
      },
      {
        "group": "SELECT weekly_schedule_entries",
        "count": 534,
        "ms": 2717.5613000002195
      }
    ],
    "sqlSumMs": 125017.76100000035
  }
]
