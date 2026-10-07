module.exports = {
  "target": "4785a72633b7b9b3921061ec48a8a29b0526e290",
  "trackedFilesUnchanged": 3378,
  "databasesAbsent": 16,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_employment_periods_test_988daa48d847ff89",
    "hr_employment_periods_migration_test_e3521cec84f2023a",
    "hr_codex_p2x_fix_controls_test_8b81a87ce16f98ba",
    "hr_codex_p2x_payroll_race_test_16a643a45a4c8fa0",
    "hr_codex_p2x_reason_test_197de8eab78ebbf0",
    "hr_codex_p2x_independent_test_2d278df207354d97",
    "hr_codex_p2x_virtual_parity_test_ee80abe8352d88a8",
    "hr_codex_p2x_lock_order_test_5f87e016123ad7f1",
    "hr_codex_p2x_lock_order_test_d582eb78f5129552",
    "hr_codex_p2x_lock_order_test_5be016f275d66a94",
    "hr_leave_year_end_test_33d090ec24abf135",
    "hr_recovery_test_86555cc6d9247b1b",
    "hr_employee_suspension_test_ad96ea8116807020",
    "hr_payroll_coverage_test_7f1bd827884af3ab",
    "hr_payroll_settlement_test_35e39c4b9761c96d",
    "hr_recovery_test_ab05169754b27f04"
  ],
  "results": [
    {
      "file": "codex-review-p2x-results-closure.cjs",
      "counts": {
        "tests": 53,
        "failed": 0,
        "passed": 53,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 53,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2x-results-independent.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p2x-results-lock-order-final.cjs",
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
      "file": "codex-review-p2x-results-lock-order-verified.cjs",
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
      "file": "codex-review-p2x-results-lock-order.cjs",
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
      "file": "codex-review-p2x-results-regressions.cjs",
      "counts": {
        "tests": 93,
        "failed": 3,
        "passed": 90,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 93,
        "suites": 0
      },
      "failures": [
        {
          "name": "letters generate real Arabic PDFs, persist once and restrict downloads to owner/scoped HR",
          "error": "The browser is already running for D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2x-tmp\\puppeteer_dev_chrome_profile-rOGwWC. Use a different `userDataDir` or stop the running browser first."
        },
        {
          "name": "letter template catalog, draft validation, preview and optimistic editing enforce access and publication",
          "error": "Expected values to be strictly equal:\n\n500 !== 201\n"
        },
        {
          "name": "approved custom letter uses the bound published revision and preserves its issued snapshot",
          "error": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        }
      ]
    }
  ]
}
