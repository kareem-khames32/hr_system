module.exports = {
  "schema": [
    [
      {
        "version": "16.0.4255.1",
        "edition": "Express Edition (64-bit)",
        "compatibility": 160,
        "foreignKeys": 19,
        "tables": 120,
        "paidPayMethodBytes": 40,
        "scopeBranchIdsBytes": null,
        "weekendExceptionsBytes": null,
        "collation": "SQL_Latin1_General_CP1_CI_AS",
        "ledgerCount": 69
      }
    ],
    [
      {
        "tableName": "approval_steps",
        "fkCount": 1
      },
      {
        "tableName": "payroll_policy_tiers",
        "fkCount": 1
      },
      {
        "tableName": "loan_installment_events",
        "fkCount": 1
      },
      {
        "tableName": "employee_salary_history_versions",
        "fkCount": 1
      },
      {
        "tableName": "employee_salary_history",
        "fkCount": 1
      },
      {
        "tableName": "teams",
        "fkCount": 1
      },
      {
        "tableName": "departments",
        "fkCount": 1
      },
      {
        "tableName": "payroll_lateness_tier_set_tiers",
        "fkCount": 1
      },
      {
        "tableName": "payroll_runs",
        "fkCount": 1
      },
      {
        "tableName": "loan_recovery_events",
        "fkCount": 1
      },
      {
        "tableName": "payroll_policy_versions",
        "fkCount": 2
      },
      {
        "tableName": "payroll_policy_events",
        "fkCount": 2
      },
      {
        "tableName": "payroll_policy_version_seals",
        "fkCount": 1
      },
      {
        "tableName": "payroll_tier_sets",
        "fkCount": 1
      },
      {
        "tableName": "payroll_policy_parameters",
        "fkCount": 1
      },
      {
        "tableName": "payroll_policy_components",
        "fkCount": 2
      }
    ]
  ],
  "indexes": [
    {
      "tableName": "attendance_days",
      "indexName": "PK_aacb5a85a1381d549a0ff0094d5",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "attendance_days",
      "indexName": "UQ_1008e668552b6b78be7ea20d11f",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "employeeId,date",
      "included": null
    },
    {
      "tableName": "attendance_days",
      "indexName": "IDX_c404ff507f913afe67767aa53e",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId",
      "included": null
    },
    {
      "tableName": "attendance_days",
      "indexName": "IDX_a59cf3cb3cdd0c1f8ba84c59a8",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "branchId",
      "included": null
    },
    {
      "tableName": "attendance_exemptions",
      "indexName": "PK_7a090579135887ba7cbe6e1e726",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "attendance_exemptions",
      "indexName": "IDX_attendance_exemption_employee",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId",
      "included": null
    },
    {
      "tableName": "attendance_punches",
      "indexName": "PK_c4fc13ad31e1f9621a66ace368c",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "attendance_punches",
      "indexName": "IDX_410806f8b13d5cef2d8323b19d",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeCode",
      "included": null
    },
    {
      "tableName": "attendance_punches",
      "indexName": "IDX_9d9b29c69115eeca2e3cfdc2dd",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId,punchTime",
      "included": null
    },
    {
      "tableName": "attendance_rule_versions",
      "indexName": "PK_b163b8a05bc64bc9a22902f7dba",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "attendance_rule_versions",
      "indexName": "UX_attendance_rule_source_version",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "sourceType,sourceId,version",
      "included": null
    },
    {
      "tableName": "attendance_rule_versions",
      "indexName": "IX_attendance_rule_source_effective",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "sourceType,sourceId,effectiveFrom",
      "included": null
    },
    {
      "tableName": "employee_salary_history_versions",
      "indexName": "PK_9232583e0f862892fcadbfcb9fe",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "employee_salary_history_versions",
      "indexName": "UX_employee_salary_history_revision",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "employeeId,revision",
      "included": null
    },
    {
      "tableName": "employees",
      "indexName": "PK_b9535a98350d5b26e7eb0c26af4",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "employees",
      "indexName": "IDX_e3d0372d1ebe64cf827743666c",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "employeeCode",
      "included": null
    },
    {
      "tableName": "employees",
      "indexName": "IDX_0ee1fa8d2cfe91f9dac54f9e2f",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "branchId",
      "included": null
    },
    {
      "tableName": "leaves",
      "indexName": "PK_4153ec7270da3d07efd2e11e2a7",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "leaves",
      "indexName": "IDX_d4278e2dd5d9673eac18b6ab6f",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId",
      "included": null
    },
    {
      "tableName": "offboarding_cases",
      "indexName": "PK_d42589e157ce4db23663f2a62bd",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "offboarding_cases",
      "indexName": "IDX_40f25480fed61f82afbfb90172",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId",
      "included": null
    },
    {
      "tableName": "payroll_items",
      "indexName": "PK_c03d4c6f2f5fb77fc771c9c0ba4",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "payroll_items",
      "indexName": "UQ_a8956c19e4b58e42d1efb49d90a",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "runId,employeeId",
      "included": null
    },
    {
      "tableName": "payroll_items",
      "indexName": "IDX_060da6c31018f772e0f00de07c",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "runId",
      "included": null
    },
    {
      "tableName": "payroll_items",
      "indexName": "IDX_dc62d64995b5d00da4342556f1",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId",
      "included": null
    },
    {
      "tableName": "payroll_runs",
      "indexName": "PK_6049f42c972640c0eb99ba8035e",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "payroll_runs",
      "indexName": "IDX_8c021c007b76e771e71abddf23",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "branchId",
      "included": null
    },
    {
      "tableName": "payroll_runs",
      "indexName": "UX_payroll_run_period_name",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": true,
      "keys": "period,name",
      "included": null
    },
    {
      "tableName": "payroll_runs",
      "indexName": "IX_payroll_runs_parent",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "parentRunId",
      "included": null
    },
    {
      "tableName": "requests_config",
      "indexName": "PK_60a46d8cc29c62e9d90fc417e9d",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "key",
      "included": null
    },
    {
      "tableName": "schedule_day_overrides",
      "indexName": "PK_4dea35667764ead352b65600cf3",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "schedule_day_overrides",
      "indexName": "UQ_00680ad03e93621cdeb7cbc6627",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "employeeId,date",
      "included": null
    },
    {
      "tableName": "schedule_day_overrides",
      "indexName": "IDX_40e976db434778066c9a9d79e6",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId",
      "included": null
    },
    {
      "tableName": "schedule_day_overrides",
      "indexName": "IDX_4b688227b64c600bf69daed8ba",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "date",
      "included": null
    },
    {
      "tableName": "weekly_schedule_entries",
      "indexName": "PK_54131f03630d71b54c370f42b5b",
      "type_desc": "CLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "id",
      "included": null
    },
    {
      "tableName": "weekly_schedule_entries",
      "indexName": "UQ_1ad5481f9b1a982e0f88eab555a",
      "type_desc": "NONCLUSTERED",
      "is_unique": true,
      "has_filter": false,
      "keys": "weekStart,employeeId",
      "included": null
    },
    {
      "tableName": "weekly_schedule_entries",
      "indexName": "IDX_10aa0c75c42ffe9da2e6dad18f",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "weekStart",
      "included": null
    },
    {
      "tableName": "weekly_schedule_entries",
      "indexName": "IDX_58afbeaafe9d3e6c84e312db87",
      "type_desc": "NONCLUSTERED",
      "is_unique": false,
      "has_filter": false,
      "keys": "employeeId",
      "included": null
    }
  ],
  "dailyReadPlan": {
    "rows": 1,
    "operators": [
      "Sort",
      "Clustered Index Scan"
    ],
    "objects": [
      {
        "table": "[attendance_days]",
        "index": "[PK_aacb5a85a1381d549a0ff0094d5]"
      }
    ],
    "counters": [
      {
        "ActualRows": 1,
        "ActualElapsedms": 2,
        "ActualCPUms": 1,
        "ActualLogicalReads": 0
      },
      {
        "ActualRows": 1,
        "ActualElapsedms": 2,
        "ActualCPUms": 1,
        "ActualLogicalReads": 344,
        "ActualRowsRead": 9505
      }
    ],
    "io": [
      "Table 'Worktable'. Scan count 0, logical reads 0, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.",
      "Table 'attendance_days'. Scan count 1, logical reads 344, physical reads 1, page server reads 0, read-ahead reads 342, page server read-ahead reads 0, lob logical reads 4, lob physical reads 2, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0."
    ]
  }
}
