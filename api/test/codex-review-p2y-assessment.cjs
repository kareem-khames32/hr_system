module.exports = {
  "reviewed": [
    "b4d0b00",
    "3ed7b64"
  ],
  "selected": [
    "retry",
    "core",
    "personal-proof",
    "independent",
    "independent-corrected",
    "contract-order-valid",
    "feature-pool-http"
  ],
  "tests": 113,
  "passed": 110,
  "failed": 3,
  "byFile": {
    "codex-review-p2y-retry.integration.cjs": {
      "passed": 1,
      "failed": 0,
      "skipped": 0
    },
    "employee-suspension.integration.cjs": {
      "passed": 6,
      "failed": 0,
      "skipped": 0
    },
    "tasks-assignment-rules.test.cjs": {
      "passed": 6,
      "failed": 0,
      "skipped": 0
    },
    "tasks-ui.test.cjs": {
      "passed": 5,
      "failed": 0,
      "skipped": 0
    },
    "comments-rules.test.cjs": {
      "passed": 3,
      "failed": 0,
      "skipped": 0
    },
    "schema-readiness.test.cjs": {
      "passed": 12,
      "failed": 0,
      "skipped": 0
    },
    "tasks-assignment-rules.integration.cjs": {
      "passed": 11,
      "failed": 0,
      "skipped": 0
    },
    "tasks-assignment-rules-migration.integration.cjs": {
      "passed": 3,
      "failed": 0,
      "skipped": 0
    },
    "comments.integration.cjs": {
      "passed": 10,
      "failed": 0,
      "skipped": 0
    },
    "comments-migration.integration.cjs": {
      "passed": 3,
      "failed": 0,
      "skipped": 0
    },
    "codex-review-p2y-personal-proof.integration.cjs": {
      "passed": 0,
      "failed": 1,
      "skipped": 0
    },
    "codex-review-p2y-independent.integration.cjs": {
      "passed": 4,
      "failed": 0,
      "skipped": 0
    },
    "notifications.integration.cjs": {
      "passed": 14,
      "failed": 0,
      "skipped": 0
    },
    "tasks.integration.cjs": {
      "passed": 18,
      "failed": 0,
      "skipped": 0
    },
    "request-execution-tasks.integration.cjs": {
      "passed": 13,
      "failed": 0,
      "skipped": 0
    },
    "codex-review-p2y-contract-lock-order.integration.cjs": {
      "passed": 0,
      "failed": 1,
      "skipped": 0
    },
    "codex-review-p2y-feature-pool.integration.cjs": {
      "passed": 1,
      "failed": 1,
      "skipped": 0
    }
  },
  "failures": [
    {
      "file": "codex-review-p2y-personal-proof.integration.cjs",
      "name": "P2Y personal proof follows current employee identity after actual account relinking",
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n",
      "result": "personal-proof"
    },
    {
      "file": "codex-review-p2y-contract-lock-order.integration.cjs",
      "name": "P2Y contract renewal and request approval complete without an unhandled lock-order failure",
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n",
      "result": "contract-order-valid"
    },
    {
      "file": "codex-review-p2y-feature-pool.integration.cjs",
      "name": "P2Y ten task edits also work across an actual feature-setting write",
      "error": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "result": "feature-pool-http"
    }
  ],
  "harnessCorrections": [
    "Initial core transport denied .claude ancestor; repeated affected files with private-root-only download transport, keeping real controller authorization.",
    "Contract-race initial synthetic year used string concatenation; corrected to numeric year before the valid reproduction.",
    "Independent notification count initially used wrong column userId; corrected to recipientUserId and all four cases repeated.",
    "Feature-pool final evidence uses the actual HTTP feature-setting write; earlier exploratory evidence directly invalidated only its in-memory cache."
  ]
}
