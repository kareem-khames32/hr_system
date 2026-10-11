module.exports = {
  "selected": [
    "codex-review-p7a-dashboard",
    "codex-review-p7a-overtime"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 13484.9826
  },
  "results": [
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D03: a confidential custom definition is counted through a department filter",
      "ms": 10343.8704,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n4 !== 3\n",
      "cause": "Expected values to be strictly equal:\n\n4 !== 3\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n4 !== 3\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:84:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O03: overtime list exposes a team current name after its department changes branch",
      "ms": 9687.256,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7a-overtime.integration.cjs",
      "name": "P7A-O04 control: ten audience reads using their already-held transaction do not exhaust the pool",
      "ms": 571.9732,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p7a-dashboard.integration.cjs",
      "name": "P7A-D03: a confidential custom definition is counted through a department filter",
      "ms": 10343.8704,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n4 !== 3\n",
      "cause": "Expected values to be strictly equal:\n\n4 !== 3\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n4 !== 3\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7a-dashboard.integration.cjs:84:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_c3f9168c8870dfcc",
    "{\"case\":\"P7A-O03\",\"foreignTeamNameDisclosed\":true}",
    "{\"case\":\"P7A-O04\",\"occupied\":10,\"statuses\":[200,200,200,200,200,200,200,200,200,200]}",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_5d7db3c47ed70a1d",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13484.9826"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_c3f9168c8870dfcc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_c3f9168c8870dfcc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_5d7db3c47ed70a1d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_5d7db3c47ed70a1d\"}\n"
  ]
}
