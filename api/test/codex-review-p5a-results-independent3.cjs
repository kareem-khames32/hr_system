module.exports = {
  "selected": [
    "codex-review-p5a-reports",
    "codex-review-p5a-mobile",
    "codex-review-p5a-compensation",
    "codex-review-p5a-schedule"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 2,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 31437.5084
  },
  "results": [
    {
      "file": "codex-review-p5a-reports.integration.cjs",
      "name": "P5A-R01: confidential definition is still included by builder",
      "ms": 8924.3199,
      "pass": false,
      "error": "{\"message\":\"حقول غير معرّفة لنوع «طلب سري للبانِي»: leaveTypeCode، fromDate، toDate، leaveType — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"حقول غير معرّفة لنوع «طلب سري للبانِي»: leaveTypeCode، fromDate، toDate، leaveType — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"حقول غير معرّفة لنوع «طلب سري للبانِي»: leaveTypeCode، fromDate، toDate، leaveType — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-reports.integration.cjs:32:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-reports.integration.cjs:112:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p5a-mobile.integration.cjs",
      "name": "P5A-M01: accepted mobile punch is attached to a different fingerprint owner",
      "ms": 9055.1652,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-compensation.integration.cjs",
      "name": "P5A-C01: compensation exposes moved department identity",
      "ms": 8675.5317,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-compensation.integration.cjs",
      "name": "P5A-C02: prior line adjuster can approve after another edit",
      "ms": 231.5641,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5a-schedule.integration.cjs",
      "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 16867.8811,
      "pass": false,
      "error": "all barriers not reached: 6",
      "cause": "all barriers not reached: 6",
      "stack": "Error: all barriers not reached: 6\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-schedule.integration.cjs:114:147)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5a-reports.integration.cjs",
      "name": "P5A-R01: confidential definition is still included by builder",
      "ms": 8924.3199,
      "pass": false,
      "error": "{\"message\":\"حقول غير معرّفة لنوع «طلب سري للبانِي»: leaveTypeCode، fromDate، toDate، leaveType — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"حقول غير معرّفة لنوع «طلب سري للبانِي»: leaveTypeCode، fromDate، toDate، leaveType — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"حقول غير معرّفة لنوع «طلب سري للبانِي»: leaveTypeCode، fromDate، toDate، leaveType — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-reports.integration.cjs:32:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-reports.integration.cjs:112:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p5a-schedule.integration.cjs",
      "name": "P5A-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 16867.8811,
      "pass": false,
      "error": "all barriers not reached: 6",
      "cause": "all barriers not reached: 6",
      "stack": "Error: all barriers not reached: 6\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5a-schedule.integration.cjs:114:147)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_report_builder_test_0f1d15f3459d8b3f is absent from sys.databases.",
    "{\"id\":\"P5A-M01\",\"status\":201,\"ownPunches\":0,\"otherEmployeePunches\":1}",
    "Cleanup verified: hr_mobile_punch_test_440acd19ed5930c5 is absent from sys.databases.",
    "{\"id\":\"P5A-C01\",\"foreignDepartmentId\":2,\"leaked\":true}",
    "{\"id\":\"P5A-C02\",\"blockedBeforeSecondEdit\":true,\"previousAuthorApproved\":true}",
    "Cleanup verified: hr_comp_cycles_test_78c36fa778b6b455 is absent from sys.databases.",
    "Cleanup verified: hr_swap_consents_test_ac3b1c446dc8bf5a is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 3",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 31437.5084"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_builder_test_0f1d15f3459d8b3f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_builder_test_0f1d15f3459d8b3f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mobile_punch_test_440acd19ed5930c5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mobile_punch_test_440acd19ed5930c5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_78c36fa778b6b455\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_78c36fa778b6b455\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_ac3b1c446dc8bf5a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_ac3b1c446dc8bf5a\"}\n"
  ]
}
