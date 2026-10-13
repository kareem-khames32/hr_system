module.exports = {
  "target": "40b42e3a01e23c3091fde2ec78071164a228f308",
  "trackedFilesUnchanged": 5336,
  "databasesAbsent": 45,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_missing_punch_test_028785b8f74c131c",
    "hr_mailbox_test_a2816acfbb6d0f83",
    "hr_request_holder_test_e746b146d011fa07",
    "hr_review_evaluator_test_669b0bbaaf79135e",
    "hr_task_rules_test_95c23fee25c3cf16",
    "hr_perf_reviews_test_c3026fba2dfb4e48",
    "hr_review_evaluator_test_bbc45c63290018e5",
    "hr_missing_punch_test_7ba8c245a3207da3",
    "hr_review_evaluator_test_5469c20e1dcd645b",
    "hr_p8a_positions_test_8cd2feab96254ab8",
    "hr_meet_calls_test_3d22d10b07177174",
    "hr_missing_punch_test_ec7fa967f730c33e",
    "hr_missing_punch_test_549fae5c8af41fe6",
    "hr_review_evaluator_test_655334e0d5225c76",
    "hr_domain_2fa_test_43ffe31eb7a4b30d",
    "hr_task_scope_test_2d64d368133d9b25",
    "hr_missing_punch_test_fa73e787370b3b8a",
    "hr_review_evaluator_test_98114b234c397d39",
    "hr_raise_percent_test_de69243bd7eba903",
    "hr_hiring_suggest_test_780bfc7a2a1ca0ef",
    "hr_session_cookie_test_f1291878d03914f5",
    "hr_user_sessions_test_6b8c2e7c8c344df1",
    "hr_skip_level_test_1719fc3a83544d7f",
    "hr_administration_level_test_e38755c083837707",
    "hr_chain_holders_test_106d5a9671d600d4",
    "hr_notifications_test_763e2acfc32801e3",
    "hr_modules_test_3bfa6962e1cdaa97",
    "hr_people_feedback_test_99f927221f941855",
    "hr_meet_calls_test_09dc1bae0af11609",
    "hr_comp_cycles_test_05c7790b6078fd55",
    "hr_task_attachments_test_781caf8fc6c427d7",
    "hr_dashboard_cards_test_0ea11ef4be1d6d3d",
    "hr_meet_test_a3a0f98e328f754c",
    "hr_meet_audience_test_66f629ca73b536a8",
    "hr_meet_calls_test_fbdd2c27a7bc316e",
    "hr_positions_test_40d1feb9c592c3bc",
    "hr_punch_audience_test_370bc96909fee069",
    "hr_work_extension_test_50e3bdaa3e243599",
    "hr_missing_punch_test_654e443a17992596",
    "hr_mailbox_test_15e494180c392aff",
    "hr_missing_punch_test_bfb95d35cfb82360",
    "hr_review_evaluator_test_f5f71e8749669cef",
    "hr_p8a_positions_test_af866ef5dfe57c7f",
    "hr_missing_punch_test_e0219e56db47957a",
    "hr_review_evaluator_test_da42440f1d1ea14b"
  ],
  "results": [
    {
      "file": "codex-review-p8a-results-core.cjs",
      "counts": {
        "tests": 38,
        "failed": 1,
        "passed": 37,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 38,
        "suites": 0
      },
      "failures": [
        {
          "name": "MB-09: ولا كلمة سر في أي رد ولا سطر سجل ولا طلب على السلك ولا عمود في القاعدة",
          "error": ""
        }
      ]
    },
    {
      "file": "codex-review-p8a-results-evaluator-http.cjs",
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
          "name": "P8A-R02: actual transfer overlap and SQL lock attribution",
          "error": "Expected values to be strictly equal:\n\n400 !== 200\n"
        }
      ]
    },
    {
      "file": "codex-review-p8a-results-final.cjs",
      "counts": {
        "tests": 10,
        "failed": 0,
        "passed": 10,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 10,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p8a-results-financial.cjs",
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
      "file": "codex-review-p8a-results-http-final.cjs",
      "counts": {
        "tests": 47,
        "failed": 2,
        "passed": 45,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 47,
        "suites": 0
      },
      "failures": [
        {
          "name": "P8A-F01: late pending correction versus final payroll approval",
          "error": "{\"message\":\"حقول غير معرّفة لنوع «تصحيح/طلب بصمة»: date، punchType، time — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
          "error": "Expected values to be strictly equal:\n\n1 !== 2\n"
        }
      ]
    },
    {
      "file": "codex-review-p8a-results-http-proofs.cjs",
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
      "file": "codex-review-p8a-results-last-batches.cjs",
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
      "file": "codex-review-p8a-results-legacy.cjs",
      "counts": {
        "tests": 70,
        "failed": 4,
        "passed": 66,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 70,
        "suites": 0
      },
      "failures": [
        {
          "name": "SC-03: logout clears the cookie only for a request that carries it",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n    {\n      ok: true\n    },\n    [\n      'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',\n+     'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0'\n    ]\n  ]\n"
        },
        {
          "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    '__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0',\n+   '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0'\n  ]\n"
        },
        {
          "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   2\n-   1\n  ]\n"
        },
        {
          "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
          "error": "Expected values to be strictly equal:\n\n2 !== 1\n"
        }
      ]
    },
    {
      "file": "codex-review-p8a-results-meeting-races.cjs",
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
      "file": "codex-review-p8a-results-modules.cjs",
      "counts": {
        "tests": 76,
        "failed": 0,
        "passed": 76,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 76,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p8a-results-payroll-http.cjs",
      "counts": {
        "tests": 11,
        "failed": 1,
        "passed": 10,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 11,
        "suites": 0
      },
      "failures": [
        {
          "name": "P8A-F01: late pending correction versus final payroll approval",
          "error": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_missing_punch_test_654e443a17992596.dbo.approval_chains'; column does not allow nulls. INSERT fails."
        }
      ]
    },
    {
      "file": "codex-review-p8a-results-races.cjs",
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
          "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
          "error": "Expected values to be strictly equal:\n\n1 !== 2\n"
        }
      ]
    },
    {
      "file": "codex-review-p8a-results-races2.cjs",
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
    }
  ]
}
