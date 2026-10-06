module.exports = {
  "selected": [
    "codex-review-p2s-admission",
    "codex-review-p2s-pool",
    "codex-review-p2s-transfer"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 22471.084
  },
  "results": [
    {
      "file": "codex-review-p2s-admission.integration.cjs",
      "name": "P2S gate FIFO cannot be stolen on handoff; expired head/middle/tail do not leak places",
      "ms": 1.8561,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-admission.integration.cjs",
      "name": "P2S simultaneous expiration and release resolve each waiter exactly once",
      "ms": 0.4875,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-admission.integration.cjs",
      "name": "P2S database rejection, thrown query and commit failure release admission; queue time is deducted",
      "ms": 0.6466,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-admission.integration.cjs",
      "name": "P2S limits for unknown and single connection pools preserve the documented local-only fallback",
      "ms": 0.2571,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-pool.integration.cjs",
      "name": "P2S ten actual PATCH handlers complete with half the pool reserved for work, including a failed handler",
      "ms": 5824.847,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-pool.integration.cjs",
      "name": "P2S same-account SQL waiters consume only the limit and rejected waits release places for other accounts",
      "ms": 715.3099,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S transfer audits the actual previous branch per account; same-branch accounts only revoke sessions; triggers are supported",
      "ms": 6843.354,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S SQL predicate excludes an account rebound through PATCH while transfer is waiting",
      "ms": 318.3599,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S OUTPUT audits branch changes committed just before UPDATE and includes newly linked accounts",
      "ms": 264.1617,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S audit failure rolls back transfer, account writes and prior audit inserts; retry is complete once",
      "ms": 295.5006,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"bounded-lock-connections\",\"state\":{\"open\":5,\"waiting\":5},\"used\":5,\"max\":10}",
    "{\"rcsi\":false,\"changedAccounts\":4,\"auditEvents\":3,\"sameBranchAuditEvents\":0,\"reexecution\":false}",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22471.084"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_pool_test_cd6a12501c39d1db\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_pool_test_cd6a12501c39d1db\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_pool_test_cd6a12501c39d1db\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_transfer_test_11a32cc6180441d1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_transfer_test_11a32cc6180441d1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_transfer_test_11a32cc6180441d1\"}\n"
  ]
}
