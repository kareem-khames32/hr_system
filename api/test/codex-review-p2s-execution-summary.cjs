module.exports = {
  "reviewed": "508fbb0",
  "checkout": "23ded2a2f69549fa05aa9fc16b596ae35efc1ec2",
  "totals": {
    "passed": 109,
    "failed": 0,
    "skipped": 0
  },
  "runs": [
    {
      "file": "codex-review-p2s-results-closure.cjs",
      "selected": [
        "codex-review-p2s-account-lock",
        "codex-review-p2s-concurrency",
        "codex-review-p2s-controls",
        "codex-review-p2s-decision-race",
        "codex-review-p2s-independent",
        "codex-review-p2s-pagination",
        "codex-review-p2s-boundaries",
        "codex-review-p2s-units"
      ],
      "counts": {
        "tests": 65,
        "failed": 0,
        "passed": 65,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 65,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2s-results-new.cjs",
      "selected": [
        "codex-review-p2s-admission",
        "codex-review-p2s-pool",
        "codex-review-p2s-transfer"
      ],
      "counts": {
        "tests": 10,
        "failed": 0,
        "passed": 10,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 10,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2s-results-rcsi.cjs",
      "selected": [
        "codex-review-p2s-transfer",
        "codex-review-p2s-account-lock",
        "codex-review-p2s-concurrency"
      ],
      "counts": {
        "tests": 10,
        "failed": 0,
        "passed": 10,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 10,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2s-results-separate-gates.cjs",
      "selected": [
        "codex-review-p2s-lock-processes"
      ],
      "counts": {
        "tests": 1,
        "failed": 0,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2s-results-regressions.cjs",
      "selected": [
        "comments",
        "comments-migration",
        "attendance-calendar-transfer",
        "audit-log"
      ],
      "counts": {
        "tests": 23,
        "failed": 0,
        "passed": 23,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 23,
        "suites": 0
      }
    }
  ],
  "staticChecks": [
    {
      "area": "api",
      "exitCode": 0,
      "diagnostics": ""
    },
    {
      "area": ".",
      "exitCode": 0,
      "diagnostics": ""
    }
  ],
  "safety": {
    "onlyGuardedDisposableDatabases": true,
    "inProcessHttpOnly": true,
    "realMail": false,
    "existingFilesUnchanged": "verified separately",
    "performanceBenchmark": false
  },
  "coverage": [
    "Real PATCH pool admission with one rejected handler",
    "FIFO, shared deadline, expiration versus handoff, handler/query/commit failures",
    "SQL same-account contention and independent admission-state instances",
    "Transfer exact affected accounts, prior branch, same-branch revocation, active trigger",
    "Transfer rebinding/current branch race under RC and RCSI",
    "Atomic audit rollback and request versus background actor",
    "Prior internal comment/file/notification boundaries and account history",
    "Existing comments, comments migration, calendar transfer and audit suites"
  ],
  "limits": [
    "SQL Server 2022 with compatibility level 150, not a SQL Server 2019 engine",
    "Separate process admission simulated by independent module state; database applock tested on real SQL",
    "Single-connection fallback serializes only within one process; current application uses the default pool size 10",
    "No full application suite, browser, owner services or B2.9 work reviewed"
  ]
}
