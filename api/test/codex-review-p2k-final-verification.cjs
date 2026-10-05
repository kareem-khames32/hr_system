module.exports = {
  "target": "70a99530335d5ff3987a12e3c7b6c333425378c6",
  "trackedFilesUnchanged": 2914,
  "databasesAbsent": 12,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2k_audit_test_6c87031ff3681a6d",
    "hr_codex_p2k_audit_test_0f2a3d3e50533cdc",
    "hr_codex_p2k_current_scope_test_f55c22ebb686c0a8",
    "hr_codex_p2k_delegation_test_16e0deb393d9456e",
    "hr_codex_p2k_execution_test_37e68611c4ee0f3e",
    "hr_codex_p2k_decision_race_test_309b62013460693b",
    "hr_delegation_test_abe51cf30883299c",
    "hr_delegation_migration_test_b5508e3f72a5e140",
    "hr_audit_log_test_9d405d13f66dcccf",
    "hr_audit_log_migration_test_aa074997da31ffa3",
    "hr_delegation_test_725be89a60c31db8",
    "hr_codex_p2k_audit_test_764d4be6833de7ee"
  ],
  "results": [
    {
      "file": "codex-review-p2k-results-audit-boundaries-ready.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2k-results-audit-boundaries.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2K current visible names including SQL wildcard characters drive exact counts and pages without revealing renamed foreign parties",
          "error": "PATCH /employees/6: 400 {\"message\":\"الاسم الكامل لازم يكون بالعربي\",\"error\":\"Bad Request\",\"statusCode\":400}"
        },
        {
          "name": "P2K actor linked to a hidden party only after the event is concealed while an unrelated officer and prototype-named entity remain readable",
          "error": "PATCH /users/14: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب k3-principal@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}"
        }
      ]
    },
    {
      "file": "codex-review-p2k-results-closure.cjs",
      "counts": {
        "tests": 43,
        "failed": 0,
        "passed": 43,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 43,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2k-results-delegation-audit.cjs",
      "counts": {
        "tests": 22,
        "failed": 1,
        "passed": 21,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 22,
        "suites": 0
      },
      "failures": [
        {
          "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      5,\n      4,\n      true,\n+     false\n-     true\n    ]\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p2k-results-user-agent.cjs",
      "counts": {
        "tests": 14,
        "failed": 0,
        "passed": 14,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 14,
        "suites": 0
      },
      "failures": []
    }
  ]
}
