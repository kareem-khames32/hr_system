module.exports = {
  "selected": [
    "codex-review-p2e-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 7719.9274
  },
  "results": [
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E added request events are atomic: outbox failure rolls back submission and return",
      "ms": 5157.082,
      "pass": false,
      "error": "No metadata for \"RequestAction\" was found.",
      "cause": "No metadata for \"RequestAction\" was found.",
      "stack": "EntityMetadataNotFoundError: No metadata for \"RequestAction\" was found.\n    at DataSource.getMetadata (D:\\projects\\hr_system\\api\\node_modules\\src\\data-source\\DataSource.ts:451:30)\n    at Repository.get metadata [as metadata] (D:\\projects\\hr_system\\api\\node_modules\\src\\repository\\Repository.ts:55:40)\n    at Repository.find (D:\\projects\\hr_system\\api\\node_modules\\src\\repository\\Repository.ts:581:39)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:141:52)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E added request events are atomic: outbox failure rolls back submission and return",
      "ms": 5157.082,
      "pass": false,
      "error": "No metadata for \"RequestAction\" was found.",
      "cause": "No metadata for \"RequestAction\" was found.",
      "stack": "EntityMetadataNotFoundError: No metadata for \"RequestAction\" was found.\n    at DataSource.getMetadata (D:\\projects\\hr_system\\api\\node_modules\\src\\data-source\\DataSource.ts:451:30)\n    at Repository.get metadata [as metadata] (D:\\projects\\hr_system\\api\\node_modules\\src\\repository\\Repository.ts:55:40)\n    at Repository.find (D:\\projects\\hr_system\\api\\node_modules\\src\\repository\\Repository.ts:581:39)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:141:52)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7719.9274"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2e_boundaries_test_945b470a9b1e7beb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2e_boundaries_test_945b470a9b1e7beb\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2e_boundaries_test_945b470a9b1e7beb\"}\n"
  ]
}
