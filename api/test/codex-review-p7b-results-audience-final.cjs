module.exports = {
  "selected": [
    "codex-review-p7b-audience"
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
    "duration_ms": 15317.5476
  },
  "results": [
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A01: saved team audience still reaches the old branch after its team moves away",
      "ms": 11286.5671,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A02: empty new units audience is rejected and does not alter the module",
      "ms": 20.7603,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A03: group creation serializes before transfer, then rejects the moved employee",
      "ms": 287.2251,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7b-audience.integration.cjs",
      "name": "P7B-A04 defect: cached module subject retains a moved team until invalidation",
      "ms": 178.9769,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7B-A01\",\"movedTeamBranch\":2,\"savedAudienceBranch\":1,\"delivered\":false}",
    "{\"case\":\"P7B-A02\",\"status\":400,\"unchanged\":true}",
    "{\"case\":\"P7B-A03\",\"transferWaited\":true,\"createdBeforeTransfer\":1,\"afterTransfer\":400}",
    "{\"case\":\"P7B-A04\",\"movedByHttp\":true,\"transactionReader\":false,\"cached\":200,\"afterInvalidation\":404}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_686dc83b3af707b9",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15317.5476"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_686dc83b3af707b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_686dc83b3af707b9\"}\n"
  ]
}
