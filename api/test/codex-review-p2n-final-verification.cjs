module.exports = {
  "target": "59146d5aa5d7ceddf65930a97ca1590bd49f6044",
  "trackedFilesUnchanged": 3011,
  "databasesAbsent": 18,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 21,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2n_rcsi_test_f1d38d0346b5aff5",
    "hr_codex_p2n_rc_test_232e4892e2e127a7",
    "hr_codex_p2n_rcsi_test_f1ef018981429d25",
    "hr_docack_test_ec27c10c9c9ab3af",
    "hr_docack_migration_test_8353c393e69055f6",
    "hr_docack_test_a52ed001e26d0be0",
    "hr_docack_migration_test_8aa1f163d39e5318",
    "hr_docack_test_e0677ac4b2786383",
    "hr_docack_migration_test_f1f53139dfe895ac",
    "hr_reqexec_test_70d1294e03f69139",
    "hr_codex_p2n_independent_test_bccc802a39983d2e",
    "hr_documents_test_0be9bcae08abefdc",
    "hr_tasks_test_52b13d1f2c353d68",
    "hr_policies_test_6477f0866ac27b14",
    "hr_notifications_test_47759af5b7145668",
    "hr_documents_test_d45434eabbc80f62",
    "hr_codex_p2n_cache_test_6b473e962f256e80",
    "hr_codex_p2n_cache_test_a1a35ade50bc9f5e"
  ],
  "results": [
    {
      "file": "codex-review-p2n-results-concurrency-rcsi.cjs",
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
      "file": "codex-review-p2n-results-concurrency.cjs",
      "counts": {
        "tests": 5,
        "failed": 1,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2N concurrent issue, ack/cancel and late task links with RCSI=true",
          "error": "Login failed for user 'sa'."
        }
      ]
    },
    {
      "file": "codex-review-p2n-results-core-final.cjs",
      "counts": {
        "tests": 11,
        "failed": 0,
        "passed": 11,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 11,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2n-results-core-fixture.cjs",
      "counts": {
        "tests": 11,
        "failed": 4,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 11,
        "suites": 0
      },
      "failures": [
        {
          "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
          "error": "Expected values to be strictly equal:\n\n404 !== 200\n"
        },
        {
          "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
          "error": "Expected values to be strictly equal:\n\n404 !== 200\n"
        },
        {
          "name": "DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله",
          "error": "Expected values to be strictly equal:\n\n404 !== 200\n"
        },
        {
          "name": "DM-3: آمن للتكرار",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-FzdGFW/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-p2n-results-core.cjs",
      "counts": {
        "tests": 53,
        "failed": 10,
        "passed": 43,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 53,
        "suites": 0
      },
      "failures": [
        {
          "name": "DA-01: الإصدار بطلب إقرار — الطلب والمهمة وبصمة الملف مع الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DA-02: «مستني إقرارك» وقراءة المستند — لصاحبه بس، والبصمة من قراءة المستند مش من القايمة، وملفه بحجمه المعلَن",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DA-03: الإقرار — صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة، والدليل؛ ومهمته بتتقفل معاه",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DA-05: المهمة في محرك المهام — في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام، والتذكير والتصعيد شغالين عليها",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DA-07: السجل — حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DA-08: إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DM-3: آمن للتكرار",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-4LegpQ/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-p2n-results-independent.cjs",
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
      "file": "codex-review-p2n-results-regressions.cjs",
      "counts": {
        "tests": 62,
        "failed": 0,
        "passed": 62,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 62,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2n-results-render-environment.cjs",
      "counts": {
        "tests": 1,
        "failed": 0,
        "passed": 0,
        "cancelled": 0,
        "skipped": 1,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2n-results-schema-cache-rcsi.cjs",
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
          "name": "P2N schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks",
          "error": "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p2n-results-schema-cache.cjs",
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
          "name": "P2N schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks",
          "error": "{\"case\":\"negative-schema-cache-across-processes\",\"statusCode\":201,\"editCode\":200,\"states\":[{\"id\":1,\"status\":\"DONE\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":3}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}\n+ actual - expected\n\n  [\n+   201,\n+   200,\n+   'DONE',\n+   3\n-   400,\n-   400,\n-   'OPEN',\n-   1\n  ]\n"
        }
      ]
    }
  ]
}
