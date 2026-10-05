module.exports = {
  "selected": [
    "codex-review-p2d-live-locks",
    "codex-review-p2d-script-precision",
    "codex-review-p2d-precision-guard",
    "payroll-live",
    "payroll-daily-accrual",
    "decimal-output-precision"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 29,
      "failed": 0,
      "passed": 29,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 29,
      "suites": 0
    },
    "duration_ms": 92845.7975
  },
  "results": [
    {
      "file": "codex-review-p2d-live-locks.integration.cjs",
      "name": "P2C C real queue retries finance lock timeout without writes or recursive jobs; succeeds on retry",
      "ms": 8374.4289,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-live-locks.integration.cjs",
      "name": "P2C C worker first: real approval waits on same lock and completes after worker, without changing net",
      "ms": 1749.7191,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-live-locks.integration.cjs",
      "name": "P2C C busy refresh must report unresolved work instead of remaining zero",
      "ms": 2480.5005,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-script-precision.integration.cjs",
      "name": "P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)",
      "ms": 1671.5969,
      "pass": true,
      "skip": false
    },
    {
      "file": "typeorm-output-precision-guard.test.cjs",
      "name": "OP-G1: كل ملف بيعمل اتصال TypeORM (new DataSource أو TypeOrmModule.forRoot) محمّل تصليح دقة الأعمدة العشرية",
      "ms": 211.3616,
      "pass": true,
      "skip": false
    },
    {
      "file": "typeorm-output-precision-guard.test.cjs",
      "name": "OP-G2: السكربتات بتحمّل التصليح فعلًا — اتصال الاستيراد والترحيل والمزامنة بيعرّف جدول الإخراج بدقة العمود",
      "ms": 81.9601,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-01: المعاينة قبل أي حساب — الموظفين ظاهرين و«لسه ماتحسبش»، بصلاحية الرواتب وبنطاق الفرع",
      "ms": 7690.7971,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-02: «حدّث الحساب» بنطاق الحساب — مجموع كل موظف = مجموع صفوف تراكمه بالقرش، والتأخير والغياب بمبالغهم، وإجمالي الفرع والعملة",
      "ms": 1054.267,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-03: مهمة الليل بتحسب للموظف اللي مالوش مسير مفتوح؛ الإعداد المقفول = موظفو المسيرات المفتوحة بس؛ وإعادة التشغيل مابتحسبش تاني",
      "ms": 530.7664,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-04: يوم اتعلّم متسخ ← مهمة في الطابور ← اتنفذت ← المعاينة اتغيرت؛ والتعديلات المتتالية مهمة واحدة بوقت UTC صح",
      "ms": 467.6266,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-05: «مستحقي التقديري» للموظف — الميزة مقفولة 404، ومفتوحة أرقامه هو بس ومطابقة لصف المعاينة",
      "ms": 126.4036,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-06: المهمة مابتعيدش حساب يوم مقفول — صف مسيره معتمد أو مصروف، أو من غير مسير مفتوح والموظف ليه في فترته مسير عادي معتمد؛ والمفتوح والملغى والتكميلي بيتعادوا",
      "ms": 525.8094,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-07: سباق معاملتين على نفس مفتاح المهمة — التانية بتستنى وبترجع false ومعاملتها سليمة، بالعزل الافتراضي وبـRCSI (الفهرس الفريد هو الحكم)",
      "ms": 1510.9197,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-08: «حدّث الحساب» بميزانية وقت — كل طلب بيحسب اللي يلحقه ويقول الباقي، وبيحسب الناقصين بس، والتقدّم مضمون",
      "ms": 1336.3675,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-09: موديول الرواتب مقفول = مهمة إعادة الحساب مابتحسبش (زي مهمة الليل)، ولما يتفتح اليوم بيتحسب",
      "ms": 116.9669,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-10 (CRP2B-C-B01): صلاحية الحساب من غير صلاحية العرض — «حدّث الحساب» بيحسب وبيرجّع أعداد بس، من غير أسماء ولا مبالغ",
      "ms": 441.2062,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-11 (CRP2B-C-B03): «مكتمل» = كل أيام الفترة المطلوبة موجودة — آخر يوم لوحده، ويوم ناقص في النص، وتاريخ التعيين",
      "ms": 1071.8392,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-12 (CRP2B-C-B02): الإقفال بيتفحص جوه المعاملة تحت قفل الموظف المالي — مسير اتعتمد بين الاختيار والكتابة مابيتكتبش على أيامه",
      "ms": 5492.2584,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-13 (CRP2C-C-N01): الموظف اللي عليه عملية مالية شغالة بيتعدّ «فاضل» في التحديث — من المعاينة، ومن تراكم المسير، ومن مهمة الليل",
      "ms": 7157.3196,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-01: المسير المحسوب من الأيام المتراكمة يطابق المحسوب من الصفر بندًا ببند",
      "ms": 13706.1984,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-02: تغيير بأثر رجعي يعلّم يومه «متسخ» فقط، والنتيجة تفضل مطابقة لإعادة الحساب الكاملة",
      "ms": 2448.4856,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-03: بصمة المدخلات تمسك التغيير حتى لو محدش علّم اليوم متسخ",
      "ms": 1311.2618,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-04: الجار الليلي آمن لإعادة التشغيل ولا يلمس مسيرًا معتمدًا",
      "ms": 1661.733,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف",
      "ms": 4072.0275,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل",
      "ms": 1694.9259,
      "pass": true,
      "skip": false
    },
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-01: متغير جدول الإخراج بنفس دقة العمود — لكل جدول فيه عمود عشري بيرجع بعد الإدخال",
      "ms": 6396.5908,
      "pass": true,
      "skip": false
    },
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-02: بند مسير بكسور — الكائن بعد الحفظ = المحفوظ، والحفظ التاني مابيغيّرش ولا قرش",
      "ms": 69.7986,
      "pass": true,
      "skip": false
    },
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-03: إنشاء موظف ببدلات فيها كسور — المحفوظ بالقرش (الإنشاء بيحفظ الكائن مرتين)",
      "ms": 382.2221,
      "pass": true,
      "skip": false
    },
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-04 (CRP2B-B-N01): حدث حساب المسير بيخزن أعمدة المبالغ بكسورها زي البند المحفوظ",
      "ms": 884.0152,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"actual-queue-timeout\",\"first\":{\"recovered\":0,\"dispatched\":0,\"done\":0,\"retried\":1,\"dead\":0},\"second\":{\"recovered\":0,\"dispatched\":0,\"done\":1,\"retried\":0,\"dead\":0},\"dirtyAfter\":0,\"noRecursiveJobs\":true}",
    "{\"case\":\"worker-first-real-approval\",\"approvalStatus\":201,\"totalNet\":6000,\"closedRowsUnchanged\":true}",
    "{\"case\":\"busy-refresh-progress\",\"computed\":0,\"remaining\":1,\"pending\":1,\"retryComputed\":12,\"retryComplete\":true}",
    "{\"case\":\"legacy-import-factory\",\"memoryHousing\":1250.5,\"storedHousing\":1250.5,\"patchLoaded\":true}",
    "{\"window\":{\"period\":\"2026-10\",\"startDate\":\"2026-09-23\",\"endDate\":\"2026-10-22\",\"upTo\":\"2026-10-04\",\"today\":\"2026-10-05\"},\"lateDay\":\"2026-09-23\",\"absentDay\":\"2026-09-24\"}",
    "lock-free enqueue: duplicate key under locking read committed and under RCSI returns false and leaves the second transaction usable",
    "Cleanup verified: hr_payroll_live_rcsi_test_2effc6f1a71a0f91 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_live_test_11ddb5064f0b4f49 is absent from sys.databases.",
    "نفس totalNet ونفس كل بند وتفصيله في المسارين",
    "Cleanup verified: hr_payroll_accrual_test_562e61fbb001b164 no longer exists in sys.databases.",
    "{\"tablesWithReturnedDecimals\":9,\"returnedDecimalColumns\":35}",
    "Cleanup verified: hr_decimal_precision_test_d6b0d7fa46196d07 is absent from sys.databases.",
    "tests 29",
    "suites 0",
    "pass 29",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 92845.7975"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2d_live_locks_test_9d74b0b39f436c90\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2d_live_locks_test_9d74b0b39f436c90\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2d_live_locks_test_9d74b0b39f436c90\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2d_script_test_b1e9b51a5b3c5352\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2d_script_test_b1e9b51a5b3c5352\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2d_script_test_b1e9b51a5b3c5352\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_live_test_11ddb5064f0b4f49\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_live_rcsi_test_2effc6f1a71a0f91\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_live_rcsi_test_2effc6f1a71a0f91\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_live_test_11ddb5064f0b4f49\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_accrual_test_562e61fbb001b164\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_accrual_test_562e61fbb001b164\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_decimal_precision_test_d6b0d7fa46196d07\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_decimal_precision_test_d6b0d7fa46196d07\"}\n"
  ]
}
