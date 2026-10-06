module.exports = {
  "target": "8fa322aa65b0183f2c73e0d7fdb5b887e62e1e1c",
  "trackedFilesUnchanged": 3157,
  "databasesAbsent": 17,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 10,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2r_account_lock_test_1ffcb9e07d21d3eb",
    "hr_codex_p2r_boundaries_test_e6624069c2c937c3",
    "hr_codex_p2r_controls_test_ba07286749a262bd",
    "hr_comments_test_bda30a0e7a8e688b",
    "hr_comments_migration_test_124f1d670b30e7a0",
    "hr_codex_p2r_pagination_test_ec0839f0710a0f7d",
    "hr_codex_p2r_independent_test_fd0d2cfe2f5a4576",
    "hr_codex_p2r_pool_test_36c81cb1d73581e8",
    "hr_codex_p2r_pool_test_61ad446b5aa781ef",
    "hr_codex_p2r_account_lock_test_4a9c4f32bf02b5e1",
    "hr_codex_p2r_concurrency_test_8f05f5c5ef5ccf03",
    "hr_notifications_test_357bff11bc8e2e17",
    "hr_audit_log_test_a3cca87377909d6c",
    "hr_user_branch_scopes_test_1f856885f9542038",
    "hr_recovery_test_1445f70acc75c69c",
    "hr_domain_sync_test_6a564386dcbee67a",
    "hr_codex_p2r_transfer_test_bc2cec531b53bdff"
  ],
  "results": [
    {
      "file": "codex-review-p2r-results-account-lock.cjs",
      "counts": {
        "tests": 4,
        "failed": 0,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2r-results-closure.cjs",
      "counts": {
        "tests": 55,
        "failed": 0,
        "passed": 55,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 55,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2r-results-pagination.cjs",
      "counts": {
        "tests": 7,
        "failed": 0,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2r-results-pool-baseline.cjs",
      "counts": {
        "tests": 1,
        "failed": 0,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2r-results-pool.cjs",
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
      "failures": [
        {
          "name": "P2R independent account edits must not exhaust the SQL pool with lock-only transactions while their handlers wait for another connection",
          "error": "Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500"
        }
      ]
    },
    {
      "file": "codex-review-p2r-results-rcsi.cjs",
      "counts": {
        "tests": 6,
        "failed": 0,
        "passed": 6,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2r-results-regression.cjs",
      "counts": {
        "tests": 86,
        "failed": 0,
        "passed": 86,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 86,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2r-results-transfer.cjs",
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
      "failures": [
        {
          "name": "P2R executed transfer preserves the existing USER_UPDATED audit of account branch and token revocation",
          "error": "A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n"
        }
      ]
    }
  ]
}
