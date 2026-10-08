module.exports = {
  "selected": [
    "codex-review-p5b-expenses",
    "codex-review-p5b-compensation",
    "codex-review-p5b-reports",
    "codex-review-p5b-feedback",
    "codex-review-p5b-mobile",
    "codex-review-p5b-schedule",
    "codex-review-p5b-expense-pool"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 17,
      "failed": 0,
      "passed": 17,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 17,
      "suites": 0
    },
    "duration_ms": 50124.5991
  },
  "results": [
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E01: first expense submission without a human approval is rejected",
      "ms": 8823.3776,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E02: old approval authorizes a changed amount after return and automatic resubmission",
      "ms": 360.8631,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E04: old approval authorizes a changed amount after conditional steps disappear on resubmission",
      "ms": 294.3574,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E05: authorized HR on-behalf submission is rejected despite human review",
      "ms": 116.5343,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 134.9941,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C01: compensation hides moved department identity",
      "ms": 8981.2723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C02: prior line adjuster remains blocked after another edit",
      "ms": 279.7937,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C03: missing 181 blocks cycles then migration accepts exact shape and refuses malformed shape",
      "ms": 192.8165,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-reports.integration.cjs",
      "name": "P5B-R01: confidential definition is excluded by builder",
      "ms": 8852.4756,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-feedback.integration.cjs",
      "name": "P5B-F01: close waits for feedback response and publishes stable results",
      "ms": 9243.264,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-feedback.integration.cjs",
      "name": "P5B-F02: optional comment below minimum is hidden",
      "ms": 9.9252,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-feedback.integration.cjs",
      "name": "P5B-F03: calendar preserves its default shape",
      "ms": 75.8778,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-mobile.integration.cjs",
      "name": "P5B-M01: mobile punch rejects a different fingerprint owner",
      "ms": 9516.9645,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-mobile.integration.cjs",
      "name": "P5B-M02: fingerprint transfer after identity resolution cannot change punch owner",
      "ms": 234.0134,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-schedule.integration.cjs",
      "name": "P5B-S01: ten submissions finish with a full pool and transaction-local feature reads",
      "ms": 9684.8367,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-schedule.integration.cjs",
      "name": "P5B-S02: missing old module tables no longer falls back for shift submit",
      "ms": 236.1721,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expense-pool.integration.cjs",
      "name": "P5B-E03: expense submissions exhaust pool through typeFeatureOpen",
      "ms": 11090.122,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5B-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "{\"id\":\"P5B-E02\",\"reviewedAmount\":123,\"postedAmount\":999,\"oldApprovals\":1,\"newApprovals\":0,\"status\":201}",
    "{\"id\":\"P5B-E04\",\"reviewedAmount\":123,\"postedAmount\":999,\"oldApprovals\":1,\"newApprovals\":0,\"status\":201}",
    "{\"id\":\"P5B-E05\",\"status\":400,\"validHumanOnBehalfRejected\":true}",
    "{\"id\":\"P5B-E06\",\"customExpense\":400,\"customAdvance\":400}",
    "Cleanup verified: hr_expense_reports_test_8339de5c2a1fc96d is absent from sys.databases.",
    "{\"id\":\"P5B-C01\",\"foreignDepartmentId\":null,\"leaked\":false}",
    "{\"id\":\"P5B-C02\",\"blockedBeforeSecondEdit\":true,\"previousAuthorApproved\":false}",
    "{\"id\":\"P5B-C03\",\"before181\":\"blocked\",\"applied\":true,\"repeated\":true,\"malformedRejected\":true}",
    "Cleanup verified: hr_comp_cycles_test_1f73e1190dbf0638 is absent from sys.databases.",
    "{\"id\":\"P5B-R01\",\"confidentialDefinition\":true,\"exportedRows\":0}",
    "Cleanup verified: hr_report_builder_test_d171b1aad8da0059 is absent from sys.databases.",
    "{\"id\":\"P5B-F01\",\"closeStatus\":200,\"counts\":[4,4],\"inferredRating\":0}",
    "{\"id\":\"P5B-F02\",\"responses\":4,\"comments\":0}",
    "{\"id\":\"P5B-F03\",\"featureOff\":true,\"addedMeetings\":false}",
    "Cleanup verified: hr_people_feedback_test_2fba64e78293a7fc is absent from sys.databases.",
    "{\"id\":\"P5B-M01\",\"status\":409,\"ownPunches\":0,\"otherEmployeePunches\":0}",
    "{\"id\":\"P5B-M02\",\"status\":201,\"resolvedOwnerPreserved\":true}",
    "Cleanup verified: hr_mobile_punch_test_f6fc7cb524916693 is absent from sys.databases.",
    "{\"id\":\"P5B-S01\",\"featureOff\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "{\"id\":\"P5B-S02\",\"missing076\":true,\"status\":500}",
    "Cleanup verified: hr_swap_consents_test_2cf4e3a29721df20 is absent from sys.databases.",
    "{\"id\":\"P5B-E03\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"settingStatus\":500}",
    "Cleanup verified: hr_expense_reports_test_f4eb6b2a60758ccc is absent from sys.databases.",
    "tests 17",
    "suites 0",
    "pass 17",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 50124.5991"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_8339de5c2a1fc96d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_8339de5c2a1fc96d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_1f73e1190dbf0638\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_1f73e1190dbf0638\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_builder_test_d171b1aad8da0059\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_builder_test_d171b1aad8da0059\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_people_feedback_test_2fba64e78293a7fc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_people_feedback_test_2fba64e78293a7fc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mobile_punch_test_f6fc7cb524916693\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mobile_punch_test_f6fc7cb524916693\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_2cf4e3a29721df20\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_2cf4e3a29721df20\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_f4eb6b2a60758ccc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_f4eb6b2a60758ccc\"}\n"
  ]
}
