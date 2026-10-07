module.exports = {
  "target": "938004f401f858b12c3e284dab1045912f3e9d35",
  "trackedFilesUnchanged": 3416,
  "databasesAbsent": 18,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 3,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2y_contract_order_test_5c2fb8253b8971c2",
    "hr_codex_p2y_contract_order_test_8eaa681cc4607362",
    "hr_task_rules_test_1287181bb7a8a156",
    "hr_taskrules_migration_test_8f7189eb8dfa5ec6",
    "hr_comments_test_6b92c6ff38acfa40",
    "hr_comments_migration_test_a1c07ff7ff54f8af",
    "hr_codex_p2y_feature_pool_test_b118a5b2236682f1",
    "hr_codex_p2y_feature_pool_test_b389018fbcf7c174",
    "hr_codex_p2y_controls_test_15a411aab0f11c93",
    "hr_codex_p2y_controls_test_f5aa8e225850bbdd",
    "hr_notifications_test_fb9ef082c1430b98",
    "hr_tasks_test_5519246da7fdae82",
    "hr_reqexec_test_f81af20776a94402",
    "hr_codex_p2y_personal_proof_test_e206b726f2fbe039",
    "hr_task_rules_test_0634b8739ae50426",
    "hr_comments_test_e9597469edfdcf9e",
    "hr_codex_p2y_lock_order_test_d26514f7d4e34f29",
    "hr_employee_suspension_test_d96f22dbad6f1806"
  ],
  "results": [
    {
      "file": "codex-review-p2y-results-contract-order-valid.cjs",
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
          "name": "P2Y contract renewal and request approval complete without an unhandled lock-order failure",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    201,\n+   500\n-   201\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p2y-results-contract-order.cjs",
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
          "name": "P2Y contract renewal and request approval complete without an unhandled lock-order failure",
          "error": "Renewal missed barrier {\"status\":400,\"body\":{\"message\":[\"بداية العقد بصيغة YYYY-MM-DD\",\"نهاية العقد بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}"
        }
      ]
    },
    {
      "file": "codex-review-p2y-results-core.cjs",
      "counts": {
        "tests": 53,
        "failed": 2,
        "passed": 51,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 53,
        "suites": 0
      },
      "failures": [
        {
          "name": "TR-03: المهمة الشخصية — لصاحبها ومديره المباشر بس، وبيديرها صاحبها، وبرّه قايمة «المهام» والتقرير، ومن غير إشعار تكليف ولا تبليغ تأخير",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n-   200,\n-   200,\n    404,\n    404,\n    404,\n+   404,\n+   404\n  ]\n"
        },
        {
          "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n+     404,\n+     'Not Found'\n-     200,\n-     ''\n    ],\n    [\n      404,\n      'الملف غير موجود'\n    ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p2y-results-feature-pool-http.cjs",
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
          "name": "P2Y ten task edits also work across an actual feature-setting write",
          "error": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500"
        }
      ]
    },
    {
      "file": "codex-review-p2y-results-feature-pool.cjs",
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
          "name": "P2Y ten task edits do not hold the entire pool while feature refresh requires another connection",
          "error": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500"
        }
      ]
    },
    {
      "file": "codex-review-p2y-results-independent-corrected.cjs",
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
      "file": "codex-review-p2y-results-independent.cjs",
      "counts": {
        "tests": 49,
        "failed": 1,
        "passed": 48,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 49,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2Y system comments use live access when distributing an extension mention",
          "error": "Error: Invalid column name 'userId'."
        }
      ]
    },
    {
      "file": "codex-review-p2y-results-personal-proof.cjs",
      "counts": {
        "tests": 22,
        "failed": 1,
        "passed": 21,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 22,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2Y personal proof follows current employee identity after actual account relinking",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n"
        }
      ]
    },
    {
      "file": "codex-review-p2y-results-retry.cjs",
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
    }
  ]
}
