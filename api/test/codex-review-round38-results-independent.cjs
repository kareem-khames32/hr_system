module.exports = {
  "selected": [
    "codex-review-round38-event-period",
    "codex-review-round38-unassigned"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 20101.7955
  },
  "results": [
    {
      "file": "codex-review-round38-event-period.integration.cjs",
      "name": "CR38 overtime event must hide the foreign payment period as well as its numbers",
      "ms": 9618.0435,
      "pass": false,
      "error": "The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n",
      "cause": "The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-event-period.integration.cjs:340:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned lastRun conceals all foreign metadata and preserves the permitted head and stored finance",
      "ms": 5524.8964,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned top-level runs must exclude a wholly foreign historical membership after transfer",
      "ms": 83.3895,
      "pass": false,
      "error": "A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n",
      "cause": "A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-unassigned.integration.cjs:45:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned reversal reason conceals the foreign head while the company sees it and real reversal balances",
      "ms": 239.3294,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round38-event-period.integration.cjs",
      "name": "CR38 overtime event must hide the foreign payment period as well as its numbers",
      "ms": 9618.0435,
      "pass": false,
      "error": "The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n",
      "cause": "The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-event-period.integration.cjs:340:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned top-level runs must exclude a wholly foreign historical membership after transfer",
      "ms": 83.3895,
      "pass": false,
      "error": "A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n",
      "cause": "A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-unassigned.integration.cjs:45:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"overtime-request-event-run-reference\",\"directRunStatus\":403,\"requestStatus\":200,\"originalRun\":2,\"reversalRun\":3,\"branchReason\":\"عكس صرف مسير 2026-08 بمسير العكس: عاد السجل معتمدًا بلا مسير\",\"companyReason\":\"عكس صرف مسير 2026-08 (#2) بمسير العكس #3: عاد السجل معتمدًا بلا مسير\",\"selfReason\":\"عكس صرف مسير 2026-08 (#2) بمسير العكس #3: عاد السجل معتمدًا بلا مسير\",\"amount\":126.56,\"status\":\"APPROVED\",\"storedHistoryUnchanged\":true}",
    "Cleanup verified: hr_codex_r38_ot_test_f7b124c465a83aa1 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "{\"case\":\"unassigned-last-run-closure\",\"foreignDirectRead\":403,\"foreignLastRun\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":null,\"status\":null,\"startDate\":null,\"endDate\":null},\"permittedLastRun\":{\"id\":1,\"name\":\"CR38 payroll فرع ألف\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\"},\"netEach\":9000,\"storedFinanceUnchanged\":true}",
    "{\"case\":\"unassigned-top-level-foreign-run\",\"foreignDirectRead\":403,\"foreignRun\":2,\"foreignBranch\":\"فرع باء المحجوب\",\"branchRuns\":[{\"id\":1,\"name\":\"CR38 payroll فرع ألف\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع ألف\"},{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع باء المحجوب\"}],\"companyRuns\":[{\"id\":1,\"name\":\"CR38 payroll فرع ألف\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع ألف\",\"members\":1,\"excluded\":0},{\"id\":2,\"name\":\"CR38 payroll فرع باء المحجوب\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع باء المحجوب\",\"members\":1,\"excluded\":0}],\"branchSummary\":{\"from\":\"2026-07-01\",\"to\":\"2026-07-22\",\"onJob\":2,\"covered\":2,\"unassigned\":0,\"suspended\":0,\"dataIssues\":0,\"duplicates\":0},\"storedFinanceUnchanged\":true}",
    "{\"case\":\"unassigned-reversal-reason-closure\",\"branchReason\":{\"code\":\"REVERSED_IN_RUN\",\"label\":\"عُكس صرف بنده في مسير للفترة ولم يُصرف بمسير تكميلي بعد\",\"detail\":\"نُفّذ عكس صرف بنده؛ اصرفه بمسير تكميلي مربوط بالمسير\",\"run\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":null,\"status\":null,\"startDate\":null,\"endDate\":null}},\"companyReason\":{\"code\":\"REVERSED_IN_RUN\",\"label\":\"عُكس صرف بنده في مسير للفترة ولم يُصرف بمسير تكميلي بعد\",\"detail\":\"نُفّذ عكس صرف بنده؛ اصرفه بمسير تكميلي مربوط بالمسير\",\"run\":{\"id\":2,\"name\":\"CR38 payroll فرع باء المحجوب\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\"}},\"originalNet\":9000,\"reversalNet\":-9000,\"storedFinanceUnchanged\":true}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 20101.7955"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r38_ot_test_f7b124c465a83aa1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r38_ot_test_f7b124c465a83aa1\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r38_unassigned_test_020959d6278db71a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r38_unassigned_test_020959d6278db71a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r38_unassigned_test_020959d6278db71a\"}\n"
  ]
}
