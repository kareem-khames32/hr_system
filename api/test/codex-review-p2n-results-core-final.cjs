module.exports = {
  "selected": [
    "hr-document-acknowledgements",
    "hr-document-acknowledgements-migration"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 36867.4258
  },
  "results": [
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-01: الإصدار بطلب إقرار — الطلب والمهمة وبصمة الملف مع الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار",
      "ms": 11297.0615,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-02: «مستني إقرارك» وقراءة المستند — لصاحبه بس، والبصمة من قراءة المستند مش من القايمة، وملفه بحجمه المعلَن",
      "ms": 160.4481,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-03: الإقرار — صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة، والدليل؛ ومهمته بتتقفل معاه",
      "ms": 345.7191,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
      "ms": 498.2206,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-05: المهمة في محرك المهام — في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام، والتذكير والتصعيد شغالين عليها",
      "ms": 937.1659,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
      "ms": 505.7788,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-07: السجل — حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي",
      "ms": 275.5876,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-08: إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول",
      "ms": 247.2118,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10549.591,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله",
      "ms": 3587.7044,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 569.4186,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_docack_test_ec27c10c9c9ab3af is absent from sys.databases.",
    "Cleanup verified: hr_docack_migration_test_8353c393e69055f6 is absent from sys.databases.",
    "tests 11",
    "suites 0",
    "pass 11",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 36867.4258"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_docack_test_ec27c10c9c9ab3af\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_docack_test_ec27c10c9c9ab3af\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_docack_migration_test_8353c393e69055f6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_docack_migration_test_8353c393e69055f6\"}\n"
  ]
}
