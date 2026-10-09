module.exports = {
  "target": "0866386a4655230307577850344fcc934e487e35",
  "trackedFilesUnchanged": 4904,
  "databasesAbsent": 46,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 4,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_aiassist_test_d6731f28c79e46a6",
    "hr_setup_import_test_b148526d61785433",
    "hr_public_api_test_e7552b61fd517e64",
    "hr_webhooks_test_83c3b9547889de16",
    "hr_aiaction_test_bab56a58d161a7f3",
    "hr_aiassistx_test_d731b2b851a449ca",
    "hr_aiassist_test_77e9f9d592bf35a6",
    "hr_setup_import_test_6818b3f4ae1de85d",
    "hr_aiaction_test_3a77d9ac14b3fac5",
    "hr_aiassistx_test_c3b4c609207f3e57",
    "hr_public_api_test_9b925012c4dde18a",
    "hr_sso_oidc_test_ad1946aaad70222c",
    "hr_provision_test_ab7fb63ada5e99d1",
    "hr_provision_test_e6fcff6e593012cf",
    "hr_provision_test_b5c684a24cc0f0e7",
    "hr_provision_test_cb90147e2abb4c10",
    "hr_provision_test_cd56a120e912ca51",
    "hr_provision_test_38028a6d2bb1c538",
    "hr_public_api_test_2c16148d0bf7bc6e",
    "hr_webhooks_test_72e70e0081d77a5f",
    "hr_setup_import_test_810d5e1850f55058",
    "hr_user_language_test_68e5e53e6c09a18f",
    "hr_public_api_test_02d7824620760be6",
    "hr_webhooks_test_f063fdb79517ac4b",
    "hr_sso_oidc_test_c201feca8bc7b9aa",
    "hr_cost_center_test_3707a2c92fef24ae",
    "hr_aiassist_test_5faa98aea6f59ca0",
    "hr_aiaction_test_c127d66c7e6456ba",
    "hr_aireports_test_211dcdf5b07c136f",
    "hr_aiassistx_test_c758a86e7a771459",
    "hr_notify_migration_test_1e5a3c579d29da75",
    "hr_setup_import_test_c4f69f33128b7f99",
    "hr_user_language_test_e8122f43568cb63d",
    "hr_public_api_test_a5cd9d2165b21785",
    "hr_webhooks_test_203b773e101bd1ab",
    "hr_sso_oidc_test_c038b2e4b62490c9",
    "hr_cost_center_test_a84eec65e7e59793",
    "hr_aiassist_test_be5527e59d15306e",
    "hr_aiaction_test_bbabbabd5e49bbd8",
    "hr_aireports_test_8b17cb519468641c",
    "hr_aiassistx_test_caa4859df1fb9ca4",
    "hr_notify_migration_test_fc3baefa204eb34a",
    "hr_setup_import_test_ffc0330c3ccc6df8",
    "hr_setup_import_test_e64690c0debf8399",
    "hr_webhooks_test_342200a25720fc08",
    "hr_webhooks_test_41f996c6c2e7e921"
  ],
  "results": [
    {
      "file": "codex-review-p6a-results-ai-read-closure.cjs",
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
      "file": "codex-review-p6a-results-independent-final.cjs",
      "counts": {
        "tests": 38,
        "failed": 0,
        "passed": 38,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 38,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p6a-results-independent.cjs",
      "counts": {
        "tests": 29,
        "failed": 2,
        "passed": 27,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 29,
        "suites": 0
      },
      "failures": [
        {
          "name": "P6A-I01: settings-only account can create an employee despite original route refusing it",
          "error": "Expected values to be strictly equal:\n\n400 !== 200\n"
        },
        {
          "name": "P6A-P01: public employee exposes ids of units and manager currently outside key branches",
          "error": "{\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p6a-results-provision-closure.cjs",
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
      "file": "codex-review-p6a-results-provision-corrected.cjs",
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
          "name": "CP-01: تجهيز عميل — قاعدة جديدة كاملة: 13 ملف مغطّى بالأساس والباقي مطبّق، الدفتر كامل والفرق عن الكيانات صفر، ومدير نظام مقفول، وكيان وفرع وباقة",
          "error": "الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql — docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql (دفعة 4 من 6): REVIEW_PROTECTED_DATABASE_REFERENCE"
        }
      ]
    },
    {
      "file": "codex-review-p6a-results-provision.cjs",
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
          "name": "CP-01: تجهيز عميل — قاعدة جديدة كاملة: 13 ملف مغطّى بالأساس والباقي مطبّق، الدفتر كامل والفرق عن الكيانات صفر، ومدير نظام مقفول، وكيان وفرع وباقة",
          "error": "الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260914_015_db_step9_data_decisions.sql — docs/migrations/payroll/20260914_015_db_step9_data_decisions.sql (دفعة 1 من 5): REVIEW_PROTECTED_DATABASE_REFERENCE"
        }
      ]
    },
    {
      "file": "codex-review-p6a-results-public-webhook.cjs",
      "counts": {
        "tests": 12,
        "failed": 0,
        "passed": 12,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 12,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p6a-results-regression-final.cjs",
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
      "file": "codex-review-p6a-results-regression.cjs",
      "counts": {
        "tests": 48,
        "failed": 1,
        "passed": 47,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 48,
        "suites": 0
      },
      "failures": [
        {
          "name": "SS-02: الدخول — هوية المزوّد بتتطابق بالموظف بنفس منطق حساب الشركة: أول دخول بيعمل حساب واحد مربوط، والتاني بيلاقيه بالمعرّف الثابت حتى لو البريد اتغيّر عند المزوّد",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n    undefined,\n    true,\n+   false,\n-   true,\n    'sso:47aea5bea5f6b28fe60533d2675cc1c3a277a6fc2e3ab0988c1ac05a',\n    'employee',\n    '[]',\n    false\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p6a-results-setup-closure.cjs",
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
      "file": "codex-review-p6a-results-setup-final.cjs",
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
      "file": "codex-review-p6a-results-webhook-tls-verified.cjs",
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
    }
  ]
}
