module.exports = {
  "target": "d1fb6a1b9977326c7da220291868c671a17a757c",
  "trackedFilesUnchanged": 4133,
  "databasesAbsent": 30,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 3,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_surveys_test_a57bfc7efbd8ee34",
    "hr_penalties_test_dced3f3c9a6c11f6",
    "hr_cases_test_098042cb4f0602a1",
    "hr_helpdesk_test_8d678a676feb3dd4",
    "hr_perf_goals_test_53dc155531a9a250",
    "hr_perf_reviews_test_5f88c9f52d6e2a09",
    "hr_perf_rewards_test_6fa700eacb0117c3",
    "hr_training_test_e1dd3e0521d79646",
    "hr_preboarding_test_fb7fb3d002167929",
    "hr_policies_test_8326aa7c45d474a7",
    "hr_tasks_test_cea409bfcbf22197",
    "hr_dependents_test_d0730d99d3255850",
    "hr_candidate_apps_test_292807c671051f83",
    "hr_codex_p3l_case_test_42058f98abf3b5cf",
    "hr_penalties_test_5a6329d2441aacad",
    "hr_perf_rewards_test_56bd52e6649c6ea3",
    "hr_preboarding_test_f91f5857fe07ea49",
    "hr_penalties_test_edeb1e1c6e39bccc",
    "hr_codex_p3l_surveys_test_63608cf5d718c91a",
    "hr_codex_p3l_unit_scope_test_2743a060cae3b8c7",
    "hr_codex_p3l_case_test_a69777c088229ff6",
    "hr_codex_p3l_knowledge_test_44c7a20207a19c4a",
    "hr_session_cookie_test_4301846ced76f70e",
    "hr_user_sessions_test_9ea137f87b152378",
    "hr_login_security_test_5c53d104f7533bf3",
    "hr_2fa_race_test_9eef3dad5a86271e",
    "hr_task_rules_test_3c9f0112dcb96534",
    "hr_modules_test_954c7a13512ee799",
    "hr_codex_p3l_surveys_test_d1915181e7eefbea",
    "hr_codex_p3l_policy_pool_test_8a8375e92404c7e8"
  ],
  "results": [
    {
      "file": "codex-review-p3l-results-baseline.cjs",
      "counts": {
        "tests": 79,
        "failed": 0,
        "passed": 79,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 79,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3l-results-extended-controls.cjs",
      "counts": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3l-results-financial-preboarding.cjs",
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
      "file": "codex-review-p3l-results-penalties.cjs",
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
      "file": "codex-review-p3l-results-privacy-controls.cjs",
      "counts": {
        "tests": 6,
        "failed": 1,
        "passed": 5,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3L-S03: response inserted after close changes already published anonymous result",
          "error": "Expected values to be strictly equal:\n\n200 !== 201\n"
        }
      ]
    },
    {
      "file": "codex-review-p3l-results-shared-auth.cjs",
      "counts": {
        "tests": 48,
        "failed": 0,
        "passed": 48,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 48,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3l-results-survey-pool.cjs",
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
      "file": "codex-review-p3l-results-units.cjs",
      "counts": {
        "tests": 65,
        "failed": 0,
        "passed": 65,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 65,
        "suites": 0
      },
      "failures": []
    }
  ]
}
