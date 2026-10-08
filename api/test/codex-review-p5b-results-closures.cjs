module.exports = {
  "selected": [
    "codex-review-p5b-expenses",
    "codex-review-p5b-compensation",
    "codex-review-p5b-reports",
    "codex-review-p5b-feedback",
    "codex-review-p5b-mobile",
    "codex-review-p5b-schedule"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 1,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 40062.1876
  },
  "results": [
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5b-expenses.integration.cjs",
      "ms": 2780.8286,
      "pass": false,
      "error": "test failed"
    },
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C01: compensation exposes moved department identity",
      "ms": 9968.5947,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-compensation.integration.cjs",
      "name": "P5B-C02: prior line adjuster can approve after another edit",
      "ms": 310.62,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-reports.integration.cjs",
      "name": "P5B-R01: confidential definition is still included by builder",
      "ms": 9747.5151,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-feedback.integration.cjs",
      "name": "P5B-F01: close does not serialize with feedback response",
      "ms": 9807.1514,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-feedback.integration.cjs",
      "name": "P5B-F02: optional comment below minimum is published",
      "ms": 12.725,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-feedback.integration.cjs",
      "name": "P5B-F03: calendar changes its default shape",
      "ms": 94.9595,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-mobile.integration.cjs",
      "name": "P5B-M01: accepted mobile punch is attached to a different fingerprint owner",
      "ms": 9638.1928,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-schedule.integration.cjs",
      "name": "P5B-S01: ten submissions exhaust pool while reading swap feature after real settings write",
      "ms": 9231.5967,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5b-expenses.integration.cjs",
      "ms": 2780.8286,
      "pass": false,
      "error": "test failed"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5B-C01\",\"foreignDepartmentId\":null,\"leaked\":false}",
    "{\"id\":\"P5B-C02\",\"blockedBeforeSecondEdit\":true,\"previousAuthorApproved\":false}",
    "Cleanup verified: hr_comp_cycles_test_42a15f7193125765 is absent from sys.databases.",
    "{\"id\":\"P5B-R01\",\"confidentialDefinition\":true,\"exportedRows\":0}",
    "Cleanup verified: hr_report_builder_test_6e79cf9cebd7d0e4 is absent from sys.databases.",
    "{\"id\":\"P5B-F01\",\"closeStatus\":200,\"counts\":[4,4],\"inferredRating\":0}",
    "{\"id\":\"P5B-F02\",\"responses\":4,\"comments\":0}",
    "{\"id\":\"P5B-F03\",\"featureOff\":true,\"addedMeetings\":false}",
    "Cleanup verified: hr_people_feedback_test_b619a39e86ef585c is absent from sys.databases.",
    "{\"id\":\"P5B-M01\",\"status\":409,\"ownPunches\":0,\"otherEmployeePunches\":0}",
    "Cleanup verified: hr_mobile_punch_test_268291f35ccf1f33 is absent from sys.databases.",
    "{\"id\":\"P5B-S01\",\"featureOff\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "Cleanup verified: hr_swap_consents_test_f14ec20865032f96 is absent from sys.databases.",
    "tests 9",
    "suites 0",
    "pass 8",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 40062.1876"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5b-expenses.integration.cjs:118\n",
    " const submitted=await send(U.one,id);assert.equal(submitted.status,400);assert.match(submitted.body.message,/??????/)\n",
    "                                                                                                             ^^^^^^^^\n",
    "\n",
    "SyntaxError: Invalid regular expression: /??????/: Nothing to repeat\n",
    "    at wrapSafe (node:internal/modules/cjs/loader:1692:18)\n",
    "    at Module._compile (node:internal/modules/cjs/loader:1735:20)\n",
    "    at node:internal/modules/cjs/loader:1893:10\n",
    "    at Object.require.extensions.<computed> [as .js] (D:\\projects\\hr_system\\api\\node_modules\\ts-node\\src\\index.ts:1608:43)\n",
    "    at Module.load (node:internal/modules/cjs/loader:1481:32)\n",
    "    at Module._load (node:internal/modules/cjs/loader:1300:12)\n",
    "    at TracingChannel.traceSync (node:diagnostics_channel:328:14)\n",
    "    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)\n",
    "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)\n",
    "    at node:internal/main/run_main_module:33:47\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_42a15f7193125765\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_42a15f7193125765\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_builder_test_6e79cf9cebd7d0e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_builder_test_6e79cf9cebd7d0e4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_people_feedback_test_b619a39e86ef585c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_people_feedback_test_b619a39e86ef585c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mobile_punch_test_268291f35ccf1f33\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mobile_punch_test_268291f35ccf1f33\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_f14ec20865032f96\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_f14ec20865032f96\"}\n"
  ]
}
