module.exports = {
  "selected": [
    "codex-review-p5c-expense-pool",
    "codex-review-p5c-module-parity",
    "codex-review-p5c-decision-race"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 14,
      "failed": 0,
      "passed": 14,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 14,
      "suites": 0
    },
    "duration_ms": 23531.2928
  },
  "results": [
    {
      "file": "codex-review-p5c-expense-pool.integration.cjs",
      "name": "P5C-E03: ten expense submissions succeed with all pool connections held",
      "ms": 9350.4241,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-expense-pool.integration.cjs",
      "name": "P5C-E10: ten expense submissions succeed including audience reads with all pool connections held",
      "ms": 876.3854,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M01: transaction reader matches cached reader for audiences, privileges, dependencies and disabled modules",
      "ms": 8983.034,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M02: employee location and organization reads use the transaction connection and see its writes",
      "ms": 78.9863,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M03: draft submit enforces module audience after cached admission changes",
      "ms": 298.9075,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M04: both missing 076 tables match defaults in the same transaction; new expense feature stays closed",
      "ms": 199.1696,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 8095.6755,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 74.3134,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 70.51,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 70.8784,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 52.7184,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 66.7491,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 36.0121,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5c-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 38.996,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5C-E03\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "{\"id\":\"P5C-E10\",\"featureOn\":true,\"occupied\":{\"max\":10,\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201],\"settingStatus\":200}",
    "Cleanup verified: hr_expense_reports_test_e4689f59a94dec03 is absent from sys.databases.",
    "{\"id\":\"P5C-M01\",\"audienceCases\":[\"roles\",\"employees\",\"departments\",\"branch\",\"team\",\"department-manager\",\"team-leader\"],\"comparisons\":41,\"matched\":true}",
    "{\"id\":\"P5C-M02\",\"movedEmployeeAllowed\":false,\"externalRepositoryCalls\":0}",
    "{\"id\":\"P5C-M03\",\"outsideAudience\":404,\"requestStillDraft\":true,\"editUnderReview\":409}",
    "{\"id\":\"P5C-M04\",\"missing076\":true,\"expenseFeature\":false,\"expenseRoute\":404}",
    "Cleanup verified: hr_expense_reports_test_e2261c95c0a9acca is absent from sys.databases.",
    "tests 14",
    "suites 0",
    "pass 14",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23531.2928"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_e4689f59a94dec03\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_e4689f59a94dec03\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_e2261c95c0a9acca\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_e2261c95c0a9acca\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_decision_race_test_723912e4f2682b29\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_decision_race_test_723912e4f2682b29\"}\n"
  ]
}
