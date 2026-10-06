module.exports = {
  "selected": [
    "hr-document-acknowledgements",
    "hr-document-acknowledgements-migration"
  ],
  "summary": {
    "success": false,
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
    "duration_ms": 32658.0131
  },
  "results": [
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-01: الإصدار بطلب إقرار — الطلب والمهمة وبصمة الملف مع الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار",
      "ms": 9806.4569,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-02: «مستني إقرارك» وقراءة المستند — لصاحبه بس، والبصمة من قراءة المستند مش من القايمة، وملفه بحجمه المعلَن",
      "ms": 155.7382,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-03: الإقرار — صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة، والدليل؛ ومهمته بتتقفل معاه",
      "ms": 335.8291,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
      "ms": 135.5603,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements.integration.cjs:360:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-05: المهمة في محرك المهام — في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام، والتذكير والتصعيد شغالين عليها",
      "ms": 1075.2619,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
      "ms": 274.3935,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements.integration.cjs:536:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-07: السجل — حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي",
      "ms": 382.6286,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-08: إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول",
      "ms": 290.1882,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10868.5143,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله",
      "ms": 228.9941,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements-migration.integration.cjs:204:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 1015.1873,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-FzdGFW/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-FzdGFW/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-FzdGFW/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements-migration.integration.cjs:269:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
      "ms": 135.5603,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements.integration.cjs:360:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
      "ms": 274.3935,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements.integration.cjs:536:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله",
      "ms": 228.9941,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements-migration.integration.cjs:204:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 1015.1873,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-FzdGFW/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-FzdGFW/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ [\n+   'api/test/codex-review-p2n-tmp/hr-docack-migrations-FzdGFW/payroll/20261006_092_document_acknowledgements.sql'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\hr-document-acknowledgements-migration.integration.cjs:269:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_docack_test_a52ed001e26d0be0 is absent from sys.databases.",
    "Cleanup verified: hr_docack_migration_test_8aa1f163d39e5318 is absent from sys.databases.",
    "tests 11",
    "suites 0",
    "pass 7",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32658.0131"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_docack_test_a52ed001e26d0be0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_docack_test_a52ed001e26d0be0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_docack_migration_test_8aa1f163d39e5318\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_docack_migration_test_8aa1f163d39e5318\"}\n"
  ]
}
