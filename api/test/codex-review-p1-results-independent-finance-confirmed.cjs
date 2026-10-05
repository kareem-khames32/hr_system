module.exports = {
  "selected": [
    "codex-review-p1-finance-concurrency",
    "codex-review-p1-restore"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 19544.3772
  },
  "results": [
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 simultaneous loan disbursements persist exactly one reference without changing balance",
      "ms": 5791.6622,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 loan disbursement rechecks branch after waiting for the finance lock",
      "ms": 109.2757,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 simultaneous settlement payment recordings preserve exactly one reference and the approved net",
      "ms": 414.6976,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p1-restore.integration.cjs",
      "name": "P1 restore and CHECKDB recover a full synthetic schema and exact employee data",
      "ms": 6403.3958,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"loan-once\",\"statuses\":[201,409],\"amount\":900,\"installmentsUnchanged\":true}",
    "{\"case\":\"loan-transfer-race\",\"status\":404,\"persistedPayment\":false}",
    "{\"case\":\"settlement-once\",\"statuses\":[201,409],\"net\":184855.89,\"netAndStatusUnchanged\":true}",
    "{\"case\":\"native-sql-restore\",\"inspection\":{\"checkDb\":\"passed\",\"tables\":128,\"rows\":221,\"keyTables\":{\"employees\":1,\"users\":2,\"branches\":1,\"payroll_runs\":0,\"payroll_items\":0,\"requests\":0},\"migrations\":null},\"employeeAmount\":1234.56,\"transportAndOffsiteCopyTested\":false}",
    "{\"restoredDatabaseDropped\":\"hr_codex_p1_restore_test_ac2975037ca98fe9\",\"ownedBackupDeleted\":\"/var/opt/mssql/data/hr_codex_p1_restore_test_ac2975037ca98fe9.bak\"}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 19544.3772"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_finance_test_3587da491ad0a1b8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_finance_test_3587da491ad0a1b8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_finance_test_3587da491ad0a1b8\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_backup_test_f38e60d55a5840cf\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_restore_test_ac2975037ca98fe9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_restore_test_ac2975037ca98fe9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_backup_test_f38e60d55a5840cf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_backup_test_f38e60d55a5840cf\"}\n"
  ]
}
