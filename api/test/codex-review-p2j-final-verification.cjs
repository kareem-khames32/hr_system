module.exports = {
  "target": "81d0e17c04ea0c44ef28b9449e94a97482f0000b",
  "trackedFilesUnchanged": 2893,
  "databasesAbsent": 9,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2j_delegation_test_aaa583835576622b",
    "hr_codex_p2j_execution_test_ad9cfaaf41055459",
    "hr_codex_p2j_decision_race_test_4b0c13f503b51293",
    "hr_codex_p2j_current_scope_test_2a0aa7e54be45510",
    "hr_codex_p2j_current_scope_test_189edc4425b7cbe1",
    "hr_delegation_test_0e99660ce92ded78",
    "hr_delegation_migration_test_2c8198135608e54b",
    "hr_audit_log_test_96b2f727a7230407",
    "hr_audit_log_migration_test_074983699bfd5075"
  ],
  "results": [
    {
      "file": "codex-review-p2j-results-closure.cjs",
      "counts": {
        "tests": 39,
        "failed": 0,
        "passed": 39,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 39,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2j-results-current-scope-ready.cjs",
      "counts": {
        "tests": 4,
        "failed": 2,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2J current-branch rule must also conceal the transferred delegate in the audit summary and search",
          "error": "Foreign identity remains in summary after the numeric identity is correctly hidden\n\ntrue !== false\n"
        },
        {
          "name": "P2J both creation and revocation summaries must respect the transferred delegator current branch",
          "error": "Creation and revocation still expose the now-foreign delegator by name\n+ actual - expected\n\n+ [\n+   'APPROVAL_DELEGATION_REVOKED',\n+   'APPROVAL_DELEGATION_CREATED'\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-p2j-results-current-scope.cjs",
      "counts": {
        "tests": 4,
        "failed": 4,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2J current-branch rule must also conceal the transferred delegate in the audit summary and search",
          "error": "PATCH /employees/2: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}"
        },
        {
          "name": "P2J both creation and revocation summaries must respect the transferred delegator current branch",
          "error": "PATCH /employees/3: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}"
        },
        {
          "name": "P2J identities become readable after moving into scope, all-branch and party views remain stable, and revoke still works",
          "error": "PATCH /employees/6: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}"
        },
        {
          "name": "P2J unrelated audit event response remains exactly the same for branch and all-branch readers",
          "error": "PATCH /employees/8: 400 {\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}"
        }
      ]
    },
    {
      "file": "codex-review-p2j-results-delegation-audit.cjs",
      "counts": {
        "tests": 22,
        "failed": 0,
        "passed": 22,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 22,
        "suites": 0
      },
      "failures": []
    }
  ]
}
