module.exports = {
  "selected": [
    "audit-log",
    "audit-log-migration",
    "file-upload-type",
    "stored-file-sha256-migration",
    "queue-outbox",
    "queue-outbox-migration"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 25,
      "failed": 1,
      "passed": 24,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 25,
      "suites": 0
    },
    "duration_ms": 42215.3441
  },
  "results": [
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 6995.4363,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 238.5461,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 32.7143,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 174.2498,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7739.858,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-2: من غير الجدول الإجراءات شغالة والبحث بيقول محتاج الترحيل؛ والمُرحّل بيعمل الجدول والمشغّل والفرق صفر، والتعديل والمسح مرفوضين",
      "ms": 3552.5503,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-3: آمن للتكرار",
      "ms": 743.1462,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 6975.7509,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 46.7635,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\file-upload-type.integration.cjs:156:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 57.1084,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 63.1779,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 94.0226,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 76.2012,
      "pass": true,
      "skip": false
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7903.0923,
      "pass": true,
      "skip": false
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-2: من غير العمود الرفع شغال من غير بصمة؛ والمُرحّل بيضيفه بنفس الشكل، والقديم من غير بصمة، والجديد ببصمته",
      "ms": 3247.864,
      "pass": true,
      "skip": false
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-3: آمن للتكرار",
      "ms": 589.3989,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش",
      "ms": 6330.0951,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام",
      "ms": 93.5308,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها",
      "ms": 113.7515,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع",
      "ms": 141.6607,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها",
      "ms": 2461.2653,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس",
      "ms": 23.4211,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 6838.9421,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-2: من غير الجدولين الإجراء شغال والحدث مابيتسجلش؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الحدث بيتسجل ويتوزع",
      "ms": 2863.491,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-3: آمن للتكرار",
      "ms": 571.9339,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 46.7635,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\file-upload-type.integration.cjs:156:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_audit_log_test_f011a6cdd90f1b9d is absent from sys.databases.",
    "Cleanup verified: hr_audit_log_migration_test_0d4369cf3bd58896 is absent from sys.databases.",
    "Cleanup verified: hr_file_upload_test_fa1f6554fd721ab5 is absent from sys.databases.",
    "Cleanup verified: hr_file_sha_migration_test_b977675283671bbe is absent from sys.databases.",
    "Cleanup verified: hr_queue_outbox_test_92d678c61e6820a9 is absent from sys.databases.",
    "Cleanup verified: hr_queue_migration_test_0d18ab5c04daeeb0 is absent from sys.databases.",
    "tests 25",
    "suites 0",
    "pass 24",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 42215.3441"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_f011a6cdd90f1b9d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_f011a6cdd90f1b9d\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_migration_test_0d4369cf3bd58896\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_migration_test_0d4369cf3bd58896\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_fa1f6554fd721ab5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_fa1f6554fd721ab5\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_sha_migration_test_b977675283671bbe\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_sha_migration_test_b977675283671bbe\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_outbox_test_92d678c61e6820a9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_outbox_test_92d678c61e6820a9\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_migration_test_0d18ab5c04daeeb0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_migration_test_0d18ab5c04daeeb0\"}\n"
  ]
}
