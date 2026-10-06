module.exports = {
  "selected": [
    "codex-review-p2w-residual-writers"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 2,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 7269.0903
  },
  "results": [
    {
      "file": "codex-review-p2w-residual-writers.integration.cjs",
      "name": "P2W profile opening-balance write begun in old service must not land in the new service",
      "ms": 4763.0033,
      "pass": false,
      "error": "An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n",
      "cause": "An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2w-residual-writers.integration.cjs:20:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2w-residual-writers.integration.cjs",
      "name": "P2W an empty balance inserted after rehire must not preserve the old hire-anniversary window",
      "ms": 140.6776,
      "pass": false,
      "error": "Cannot read properties of null (reading 'remaining')",
      "cause": "Cannot read properties of null (reading 'remaining')",
      "stack": "TypeError: Cannot read properties of null (reading 'remaining')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2w-residual-writers.integration.cjs:36:39)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2w-residual-writers.integration.cjs",
      "name": "P2W profile opening-balance write begun in old service must not land in the new service",
      "ms": 4763.0033,
      "pass": false,
      "error": "An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n",
      "cause": "An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2w-residual-writers.integration.cjs:20:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2w-residual-writers.integration.cjs",
      "name": "P2W an empty balance inserted after rehire must not preserve the old hire-anniversary window",
      "ms": 140.6776,
      "pass": false,
      "error": "Cannot read properties of null (reading 'remaining')",
      "cause": "Cannot read properties of null (reading 'remaining')",
      "stack": "TypeError: Cannot read properties of null (reading 'remaining')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2w-residual-writers.integration.cjs:36:39)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"profile-opening-crosses-rehire\",\"status\":200,\"joinDate\":\"2026-02-01\",\"contractNumber\":null,\"currentOpening\":10,\"frozen\":[{\"period\":\"P1:2026\",\"openingDays\":0}]}",
    "{\"case\":\"empty-anniversary-crosses-rehire\",\"actual\":{\"employeeId\":6,\"balanceType\":\"annual\",\"period\":\"2026-09-01\",\"periodStart\":\"2027-01-01\",\"periodEnd\":\"2027-01-31\",\"opening\":{\"days\":0,\"taken\":0,\"expiry\":null,\"expired\":false,\"available\":0},\"annualEntitlement\":4.25,\"accruedToDate\":4.25,\"entitled\":4.25,\"entitledTaken\":0,\"totalTaken\":0,\"adjustmentDays\":0,\"settledDays\":0,\"remaining\":4.25,\"deficit\":0},\"reference\":null,\"rows\":[{\"period\":\"2026\",\"entitled\":21,\"taken\":0},{\"period\":\"2026\",\"entitled\":180,\"taken\":0},{\"period\":\"2026-09-01\",\"entitled\":21,\"taken\":0}]}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7269.0903"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2w_residual_writers_test_1a132563b6416517\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2w_residual_writers_test_1a132563b6416517\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2w_residual_writers_test_1a132563b6416517\"}\n"
  ]
}
