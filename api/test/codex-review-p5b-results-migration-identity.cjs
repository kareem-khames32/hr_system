module.exports = {
  "selected": [
    "codex-review-p5b-compensation",
    "codex-review-p5b-mobile"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 12582.8468
  },
  "results": [
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C01: compensation exposes moved department identity",
      "ms": 9266.0094,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C02: prior line adjuster can approve after another edit",
      "ms": 258.8773,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C03: missing 181 blocks cycles then migration accepts exact shape and refuses malformed shape",
      "ms": 185.0266,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-mobile.integration.cjs",
      "name": "P5B-M01: accepted mobile punch is attached to a different fingerprint owner",
      "ms": 9156.0427,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-mobile.integration.cjs",
      "name": "P5B-M02: fingerprint transfer after identity resolution cannot change punch owner",
      "ms": 220.9718,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5B-C01\",\"foreignDepartmentId\":null,\"leaked\":false}",
    "{\"id\":\"P5B-C02\",\"blockedBeforeSecondEdit\":true,\"previousAuthorApproved\":false}",
    "{\"id\":\"P5B-C03\",\"before181\":\"blocked\",\"applied\":true,\"repeated\":true,\"malformedRejected\":true}",
    "Cleanup verified: hr_comp_cycles_test_ab0c1aaf93b3d42c is absent from sys.databases.",
    "{\"id\":\"P5B-M01\",\"status\":409,\"ownPunches\":0,\"otherEmployeePunches\":0}",
    "{\"id\":\"P5B-M02\",\"status\":201,\"resolvedOwnerPreserved\":true}",
    "Cleanup verified: hr_mobile_punch_test_909dbb9207fdc8da is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12582.8468"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_ab0c1aaf93b3d42c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_ab0c1aaf93b3d42c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mobile_punch_test_909dbb9207fdc8da\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mobile_punch_test_909dbb9207fdc8da\"}\n"
  ]
}
