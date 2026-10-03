module.exports = {
  "selected": [
    "codex-review-round39-mixed-report"
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
    "duration_ms": 12790.7447
  },
  "results": [
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 BRANCH mixed report retains allowed run head without foreign organization names",
      "ms": 6578.6279,
      "pass": false,
      "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "cause": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-mixed-report.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 DEPARTMENT mixed report retains allowed run head without foreign organization names",
      "ms": 3496.3004,
      "pass": false,
      "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "cause": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-mixed-report.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 BRANCH mixed report retains allowed run head without foreign organization names",
      "ms": 6578.6279,
      "pass": false,
      "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "cause": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-mixed-report.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 DEPARTMENT mixed report retains allowed run head without foreign organization names",
      "ms": 3496.3004,
      "pass": false,
      "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "cause": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-mixed-report.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"mixed-head-foreign-organization-label\",\"kind\":\"BRANCH\",\"fullRunRead\":403,\"mixedHeadAllowed\":true,\"hiddenName\":\"فرع باء المحجوب\",\"listHead\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع ألف، فرع باء المحجوب\"},\"summaryScopeLabel\":\"فرع: فرع ألف، فرع باء المحجوب\",\"storedNet\":18000,\"storedUnchanged\":true}",
    "{\"case\":\"mixed-head-foreign-organization-label\",\"kind\":\"DEPARTMENT\",\"fullRunRead\":403,\"mixedHeadAllowed\":true,\"hiddenName\":\"CR39 confidential department B\",\"listHead\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":\"2026-08\",\"status\":\"PAID\",\"startDate\":\"2026-07-23\",\"endDate\":\"2026-08-22\",\"scopeLabel\":\"قسم: CR39 visible department A، CR39 confidential department B\"},\"summaryScopeLabel\":\"قسم: CR39 visible department A، CR39 confidential department B\",\"storedNet\":36000,\"storedUnchanged\":true}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12790.7447"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_mixed_test_a5d7d4e4cbe60ee8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_mixed_test_a5d7d4e4cbe60ee8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_mixed_test_a5d7d4e4cbe60ee8\"}\n"
  ]
}
