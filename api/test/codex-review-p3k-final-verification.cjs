module.exports = {
  "target": "452454f532b46be55e244ea5e6a87827eda05d56",
  "trackedFilesUnchanged": 4068,
  "databasesAbsent": 40,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_onb_templates_test_1d2a071ec6040417",
    "hr_preboarding_test_2f2362eed3152615",
    "hr_probation_test_6cf3faffa0a1ff5d",
    "hr_recruitment_jobs_test_5d306b8969d259ed",
    "hr_candidate_apps_test_762abfde9324fea1",
    "hr_perf_goals_test_f880990731f9cfb4",
    "hr_perf_reviews_test_ea64bf7799f8b109",
    "hr_perf_rewards_test_2cccec9c593df0be",
    "hr_training_test_797aca7bb94504a6",
    "hr_helpdesk_test_9a4c7002b5d4d4b5",
    "hr_cases_test_c2a0a42eb8fed220",
    "hr_penalties_test_6085dab468134444",
    "hr_surveys_test_f6cd512dbf8012ab",
    "hr_dependents_test_ccd3f77fbdac4ef3",
    "hr_p3_migrations_test_3bd3cdc0b9f84835",
    "hr_onb_tpl_migration_test_951d34c6b068a12a",
    "hr_recruit_migration_test_5f1982e1d3d1ff1d",
    "hr_codex_p3k_case_test_ad04a49b0f070991",
    "hr_codex_p3k_decision_test_f5c1abe6adeef8ea",
    "hr_codex_p3k_dependent_control_test_7807e20a8069a196",
    "hr_perf_rewards_test_57100fdfbafd5267",
    "hr_codex_p3k_unit_scope_test_d83e6f120a12bac9",
    "hr_codex_p3k_survey_test_0a2f2fb68835b56e",
    "hr_codex_p3k_knowledge_test_9d9b4a4e0d655cd7",
    "hr_penalties_test_66a93e14ba0f187f",
    "hr_penalties_test_e9077b36343303eb",
    "hr_penalties_test_252206264c4ea42d",
    "hr_preboarding_test_fe7fe2525f75d3dd",
    "hr_codex_p3k_survey_test_901517f470e89c7f",
    "hr_codex_p3k_case_test_303e7d08145df10b",
    "hr_session_cookie_test_d42af5d367280ef5",
    "hr_user_sessions_test_b039c4ecca0b84e9",
    "hr_totp_test_363956cd26878543",
    "hr_modules_test_617c26f86c7e8a64",
    "hr_file_upload_test_8f8f14ae9fae2033",
    "hr_tasks_test_cc7fca64ec724f3e",
    "hr_policies_test_c711bb0ee45a44b9",
    "hr_recovery_test_dae612eed8e23ad3",
    "hr_perf_rewards_test_4155874cd817c78a",
    "hr_codex_p3k_unit_scope_test_73ef160104a244eb"
  ],
  "results": [
    {
      "file": "codex-review-p3k-results-baseline.cjs",
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
    },
    {
      "file": "codex-review-p3k-results-case-privacy.cjs",
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
      "file": "codex-review-p3k-results-decision-adapted.cjs",
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
      "file": "codex-review-p3k-results-dependent-control.cjs",
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
      "file": "codex-review-p3k-results-final-probes.cjs",
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
      "file": "codex-review-p3k-results-knowledge-money.cjs",
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
      "file": "codex-review-p3k-results-penalties-final.cjs",
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
      "file": "codex-review-p3k-results-penalties.cjs",
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
          "name": "P3K-P01: unchanged occurrence accepts a different monetary penalty than preview",
          "error": "{\"code\":\"DEDUCTION_ABOVE_PCT_OF_GROSS\",\"message\":\"مبلغ الخصم 3000.00 يتجاوز الحد 2250.00 (25% من إجمالي الراتب 9000.00)\",\"limit\":\"2250.00\",\"amount\":\"3000.00\"}\n\n400 !== 201\n"
        }
      ]
    },
    {
      "file": "codex-review-p3k-results-preboarding.cjs",
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
      "file": "codex-review-p3k-results-privacy.cjs",
      "counts": {
        "tests": 2,
        "failed": 1,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3K-C01: handler account rebound to respondent retains full case and complainant identity",
          "error": "Login failed for user 'sa'."
        }
      ]
    },
    {
      "file": "codex-review-p3k-results-regression.cjs",
      "counts": {
        "tests": 118,
        "failed": 8,
        "passed": 110,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 118,
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
    },
    {
      "file": "codex-review-p3k-results-reward-fault.cjs",
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
          "name": "P3K-R01: post-commit bonus read failure releases reservation and retry creates another bonus",
          "error": "{\"message\":\"قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p3k-results-unit-files.cjs",
      "counts": {
        "tests": 114,
        "failed": 0,
        "passed": 114,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 114,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3k-results-units-scope.cjs",
      "counts": {
        "tests": 2,
        "failed": 1,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "name": "D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-units.integration.cjs",
          "error": "test failed"
        }
      ]
    }
  ]
}
