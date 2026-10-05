module.exports = {
  "selected": [
    "codex-review-p2h-closure"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 12926.2444
  },
  "results": [
    {
      "file": "codex-review-p2h-closure.integration.cjs",
      "name": "P2H task scope, role scope and current manager identity are enforced without an existence signal",
      "ms": 6814.2018,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2h-closure.integration.cjs",
      "name": "P2H employee assignment survives a branch move and same-assignee edit; forwarding outside authority is rejected",
      "ms": 282.1774,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2h-closure.integration.cjs",
      "name": "P2H task creation, reassignment and reminder stamps roll back if the outbox write fails",
      "ms": 251.3981,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2h-closure.integration.cjs",
      "name": "P2H hiring-document work must reappear in My Tasks when its required catalogue flag changes",
      "ms": 474.5042,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2h-closure.integration.cjs",
      "name": "P2H an old reminder cannot become valid again merely because the new due date got a fresh reminder stamp",
      "ms": 1539.9426,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"scope-and-relinked-manager\",\"hidden\":404,\"unknown\":404,\"removedCreatorActions\":404,\"unchanged\":true}",
    "{\"case\":\"stamped-branch-and-direct-manager\",\"keptBranch\":true,\"unrelatedTransfer\":403,\"ownerClose\":201}",
    "{\"case\":\"task-outbox-atomicity\",\"create\":500,\"reassign\":500,\"reminded\":0,\"rowAndCountUnchanged\":true}",
    "{\"case\":\"hiring-docs-current-state\",\"beforeSourceRead\":true,\"sourceStatus\":\"PENDING\",\"sourceCanAct\":true,\"afterSourceRead\":true}",
    "{\"case\":\"reminder-rearmed-stamp\",\"results\":[{\"mode\":\"ON\",\"currentDue\":\"2026-10-06\",\"oldDue\":\"2026-10-05\",\"sent\":0,\"oldDateInBody\":false,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"currentDue\":\"2026-10-06\",\"oldDue\":\"2026-10-05\",\"sent\":0,\"oldDateInBody\":false,\"status\":\"SKIPPED\"}]}",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12926.2444"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2h_independent_test_79514166fa48d227\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2h_independent_test_79514166fa48d227\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2h_independent_test_79514166fa48d227\"}\n"
  ]
}
