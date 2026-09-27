module.exports = {
  "selected": [
    "codex-review-round12-migrations"
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
    "duration_ms": 13535.9775
  },
  "results": [
    {
      "file": "codex-review-round12-migrations.integration.cjs",
      "name": "CR12 both migrations together preserve populated legacy data, replay safely, and match all current entities",
      "ms": 10811.3742,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13535.9775"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r12migration_test_00f79a8e143909ea\"}\n",
    "CR12_EVIDENCE {\"server\":{\"productVersion\":\"16.0.4255.1\",\"compatibility_level\":150},\"trial\":true,\"applied\":[\"20260927_072_department_unit_type.sql\",\"20260927_073_requests_config_value_4000.sql\"],\"existingDepartmentRows\":4,\"existingConfigRows\":140,\"oldValuesPreserved\":true,\"newColumns\":[\"departments.unitType\"],\"widened\":[\"requests_config.value: nvarchar(500) → nvarchar(4000)\"],\"schemaDiff\":0,\"ledgerReplayApplied\":0,\"directReplays\":2,\"legacyExecutiveParentStillEditable\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r12migration_test_00f79a8e143909ea\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r12migration_test_00f79a8e143909ea\"}\n"
  ]
}
