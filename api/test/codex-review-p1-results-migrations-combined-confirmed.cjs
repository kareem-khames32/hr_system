module.exports = {
  "selected": [
    "codex-review-p1-migrations"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 9075.7386
  },
  "results": [
    {
      "file": "codex-review-p1-migrations.integration.cjs",
      "name": "P1 all eight migrations together preserve old rows, permit old-schema boot and replay with zero schema difference",
      "ms": 6772.3602,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"combined-076-083\",\"files\":[\"20261002_076_system_modules.sql\",\"20261002_077_system_modules_company_seed.sql\",\"20261003_078_login_security.sql\",\"20261003_079_scheduled_job_runs.sql\",\"20261003_080_statutory_gosi_tracks.sql\",\"20261003_081_employee_payment_changes.sql\",\"20261003_082_loan_disbursement.sql\",\"20261003_083_settlement_payment.sql\"],\"oldSchemaBoot\":true,\"existingRowsUnchanged\":true,\"replayUnchanged\":true,\"schemaDifference\":0,\"compatibility\":150}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9075.7386"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_migrations_test_3fdf3a553ede9247\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_migrations_test_3fdf3a553ede9247\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_migrations_test_3fdf3a553ede9247\"}\n"
  ]
}
