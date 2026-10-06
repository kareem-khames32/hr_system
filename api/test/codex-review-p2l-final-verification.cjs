module.exports = {
  "target": "9007ecbf88dc84e7d8ec88a638fafea698d9a25b",
  "trackedFilesUnchanged": 2956,
  "databasesAbsent": 9,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 5,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_policies_test_b5e37b8a17c61bbf",
    "hr_policies_test_54c103109329db90",
    "hr_policies_migration_test_2b6110d5bf59ff69",
    "hr_codex_p2l_independent_test_b3240bf5bd8de65b",
    "hr_codex_p2l_independent_test_add4db26f525d1f1",
    "hr_user_temp_pw_test_a3edea9737065185",
    "hr_file_upload_test_2bb03d6b823e9a8f",
    "hr_modules_test_2a4b39ea41b74267",
    "hr_login_security_test_d5b2560e3eee0d30"
  ],
  "results": [
    {
      "file": "codex-review-p2l-results-aborted.cjs",
      "counts": {
        "tests": 0,
        "passed": 0,
        "failed": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2l-results-closure.cjs",
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
      "file": "codex-review-p2l-results-independent-final.cjs",
      "counts": {
        "tests": 5,
        "failed": 3,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2L bootstrap read failure must not open an overdue account after SQL recovers",
          "error": "A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n"
        },
        {
          "name": "P2L clear cache must not cross account relinking and a new token version",
          "error": "The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n"
        },
        {
          "name": "P2L policy manager can populate the existing role audience selector without account-administration rights",
          "error": "The role picker used by the policy editor must be available to its authorized manager\n\n403 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p2l-results-independent.cjs",
      "counts": {
        "tests": 4,
        "failed": 2,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2L bootstrap read failure must not open an overdue account after SQL recovers",
          "error": "A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n"
        },
        {
          "name": "P2L clear cache must not cross account relinking and a new token version",
          "error": "The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n"
        }
      ]
    },
    {
      "file": "codex-review-p2l-results-regression.cjs",
      "counts": {
        "tests": 33,
        "failed": 0,
        "passed": 33,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 33,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2l-results-streams-final.cjs",
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
      "file": "codex-review-p2l-results-streams.cjs",
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
          "name": "P2L stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
          "error": "Expected values to be strictly equal:\n\nfalse !== true\n"
        }
      ]
    }
  ]
}
