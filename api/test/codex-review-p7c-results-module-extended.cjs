module.exports = {
  "selected": [
    "codex-review-p7c-audience"
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
    "duration_ms": 14196.2197
  },
  "results": [
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A08: old cached subject cannot authorize new audiences and accounts without employees fail closed",
      "ms": 10550.6023,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A09: dependency and enabled-module catalog use the current reference branch",
      "ms": 228.6444,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7c-audience.integration.cjs",
      "name": "P7C-A10: ten transaction-bound new-audience checks succeed while the entire pool is held",
      "ms": 254.4087,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7C-A08\",\"cachedOldCannotAuthorizeNew\":true,\"noEmployee\":404,\"superAdminAllowed\":true,\"restoredTeam\":200,\"movedDepartment\":404}",
    "{\"case\":\"P7C-A09\",\"dependency\":false,\"enabledCatalog\":false,\"inTransaction\":false}",
    "{\"case\":\"P7C-A10\",\"occupied\":10,\"allowedChecks\":10}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_b48dc6ae10ed50cb",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14196.2197"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_b48dc6ae10ed50cb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_b48dc6ae10ed50cb\"}\n"
  ]
}
