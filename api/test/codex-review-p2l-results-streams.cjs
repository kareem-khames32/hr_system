module.exports = {
  "selected": [
    "codex-review-p2l-streams"
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
    "duration_ms": 2488.328
  },
  "results": [
    {
      "file": "codex-review-p2l-streams.integration.cjs",
      "name": "P2L stream: exact bytes across chunk boundaries; preflight hashes the same bytes",
      "ms": 90.0186,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2l-streams.integration.cjs",
      "name": "P2L stream: same-size, shorter, larger and trailing-chunk replacements cannot complete the advertised length",
      "ms": 7.8101,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2l-streams.integration.cjs",
      "name": "P2L stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
      "ms": 2.5247,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "cause": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2l-streams.integration.cjs:39:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2l-streams.integration.cjs",
      "name": "P2L stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
      "ms": 2.5247,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "cause": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2l-streams.integration.cjs:39:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 2488.328"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n"
  ]
}
