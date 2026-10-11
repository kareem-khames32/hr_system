module.exports = {
  "selected": [
    "codex-review-p7a-audience",
    "codex-review-p7a-overtime"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 18091.9313
  },
  "results": [
    {
      "file": "codex-review-p7a-audience.integration.cjs",
      "name": "P7A-A03: group task commits after its employee has moved outside the assigning account scope",
      "ms": 13266.8477,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-M01 control: migration 186 rejects an unexpected column before changing the table",
      "ms": 13815.0576,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7A-A03\",\"createdOutsideCurrentScope\":true,\"status\":201}",
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_5583d8095eb22a45",
    "{\"case\":\"P7A-M01\",\"rejectsWrongShapeWithoutRepairingIt\":true}",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_9ff2380f858b3794",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18091.9313"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_5583d8095eb22a45\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_5583d8095eb22a45\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_9ff2380f858b3794\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_9ff2380f858b3794\"}\n"
  ]
}
