module.exports = {
  "target": "f9f6e7fa649a8e5d81e0e8ccfaf66861bbbd0967",
  "trackedFilesUnchanged": 2871,
  "databasesAbsent": 12,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2i_delegation_test_62d1d1df75fa17fb",
    "hr_codex_p2i_execution_test_60f635395fd77f33",
    "hr_codex_p2i_decision_race_test_855b161a9902af6b",
    "hr_delegation_test_aa471af01a0b5d2b",
    "hr_delegation_migration_test_5a4b94a8e7ef46b6",
    "hr_codex_p2i_delegation_test_3590f5388be6a8df",
    "hr_notifications_test_cfbd8fe7cf67466c",
    "hr_recovery_test_6540450cea933e09",
    "hr_reqexec_test_af2f79cb45927154",
    "hr_administration_level_test_cc0e0cfe839aab2c",
    "hr_skip_level_test_529fb14a6745246c",
    "hr_exec_cross_branch_test_179f78ab2da75089"
  ],
  "results": [
    {
      "file": "codex-review-p2i-results-audit.cjs",
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
          "name": "P2I delegation audit responses must scope foreign employee identities while preserving stored evidence",
          "error": "Creation and revocation audit JSON must not disclose the foreign employee identity"
        }
      ]
    },
    {
      "file": "codex-review-p2i-results-closure.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2i-results-decision-race.cjs",
      "counts": {
        "tests": 8,
        "failed": 0,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2i-results-delegations-core.cjs",
      "counts": {
        "tests": 37,
        "failed": 0,
        "passed": 37,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 37,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2i-results-independent.cjs",
      "counts": {
        "tests": 4,
        "failed": 1,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2I branch-only delegation administrator must not receive the identity of an unrelated foreign delegate",
          "error": "Hiding the name alone still discloses the foreign employee identity to a non-party\n\n4 !== null\n"
        }
      ]
    },
    {
      "file": "codex-review-p2i-results-regression.cjs",
      "counts": {
        "tests": 108,
        "failed": 8,
        "passed": 100,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 108,
        "suites": 0
      },
      "failures": [
        {
          "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
          "error": "failed running before hook"
        },
        {
          "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
          "error": "failed running before hook"
        }
      ]
    }
  ]
}
