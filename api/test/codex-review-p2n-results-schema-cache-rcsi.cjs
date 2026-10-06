module.exports = {
  "selected": [
    "codex-review-p2n-schema-cache"
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
    "duration_ms": 17643.5142
  },
  "results": [
    {
      "file": "codex-review-p2n-schema-cache.integration.cjs",
      "name": "P2N schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks",
      "ms": 15343.2436,
      "pass": false,
      "error": "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n",
      "cause": "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2n-schema-cache.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2n-schema-cache.integration.cjs",
      "name": "P2N schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks",
      "ms": 15343.2436,
      "pass": false,
      "error": "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n",
      "cause": "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2n-schema-cache.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 17643.5142"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2n_cache_test_6b473e962f256e80\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2n_cache_test_6b473e962f256e80\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2n_cache_test_6b473e962f256e80\"}\n"
  ]
}
