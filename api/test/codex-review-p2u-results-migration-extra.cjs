module.exports = {
  "selected": [
    "codex-review-p2u-migration-extra"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 7736.7672
  },
  "results": [
    {
      "file": "codex-review-p2u-migration-extra.integration.cjs",
      "name": "P2U migration accepts identical columns in a different physical order and completes missing indexes",
      "ms": 5239.8808,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-migration-extra.integration.cjs",
      "name": "P2U bad values table is rejected before creating the missing fields table",
      "ms": 20.597,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-migration-extra.integration.cjs",
      "name": "P2U disabled unique index is rejected before filling the other missing index",
      "ms": 14.407,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7736.7672"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_migration_extra_test_e43edd587d230ddc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_migration_extra_test_e43edd587d230ddc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_migration_extra_test_e43edd587d230ddc\"}\n"
  ]
}
