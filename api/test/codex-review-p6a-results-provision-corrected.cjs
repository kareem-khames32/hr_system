module.exports = {
  "selected": [
    "customer-provision"
  ],
  "summary": {
    "success": false,
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
    "duration_ms": 23894.2839
  },
  "results": [
    {
      "file": "customer-provision.integration.cjs",
      "name": "CP-01: تجهيز عميل — قاعدة جديدة كاملة: 13 ملف مغطّى بالأساس والباقي مطبّق، الدفتر كامل والفرق عن الكيانات صفر، ومدير نظام مقفول، وكيان وفرع وباقة",
      "ms": 11113.8812,
      "pass": false,
      "error": "الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql — docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql (دفعة 4 من 6): REVIEW_PROTECTED_DATABASE_REFERENCE",
      "cause": "الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql — docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql (دفعة 4 من 6): REVIEW_PROTECTED_DATABASE_REFERENCE",
      "stack": "Error: الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql — docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql (دفعة 4 من 6): REVIEW_PROTECTED_DATABASE_REFERENCE\n    at Object.provision (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\scripts\\customer.cjs:66:28)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\customer-provision.integration.cjs:36:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "customer-provision.integration.cjs",
      "name": "CP-02: مدخلات التجهيز وحراسته — اسم القاعدة بنمط العميل بس، والمدخلات متحكم فيها قبل أي قاعدة؛ وفشل في النص بيشيل القاعدة اللي اتعملت",
      "ms": 10165.2285,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "customer-provision.integration.cjs",
      "name": "CP-01: تجهيز عميل — قاعدة جديدة كاملة: 13 ملف مغطّى بالأساس والباقي مطبّق، الدفتر كامل والفرق عن الكيانات صفر، ومدير نظام مقفول، وكيان وفرع وباقة",
      "ms": 11113.8812,
      "pass": false,
      "error": "الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql — docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql (دفعة 4 من 6): REVIEW_PROTECTED_DATABASE_REFERENCE",
      "cause": "الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql — docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql (دفعة 4 من 6): REVIEW_PROTECTED_DATABASE_REFERENCE",
      "stack": "Error: الترحيلات ماكملتش على القاعدة الجديدة: docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql — docs/migrations/payroll/20260915_030_b5r_parity_test_runs_calculated_at_tz.sql (دفعة 4 من 6): REVIEW_PROTECTED_DATABASE_REFERENCE\n    at Object.provision (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\scripts\\customer.cjs:66:28)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\customer-provision.integration.cjs:36:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: 2 provisioning databases are absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23894.2839"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_provision_test_b5c684a24cc0f0e7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_provision_test_b5c684a24cc0f0e7\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_provision_test_cb90147e2abb4c10\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_provision_test_cb90147e2abb4c10\"}\n"
  ]
}
