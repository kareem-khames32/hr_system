module.exports = {
  "selected": [
    "comments",
    "comments-migration",
    "attendance-calendar-transfer",
    "audit-log"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 23,
      "failed": 0,
      "passed": 23,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 23,
      "suites": 0
    },
    "duration_ms": 82908.5217
  },
  "results": [
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "ms": 10129.7568,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "ms": 447.7129,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "ms": 2202.911,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "ms": 285.972,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "ms": 684.2377,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "ms": 696.3342,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "ms": 7415.9666,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "ms": 923.2836,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "ms": 6592.7136,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-10: قفل تعديل الحساب مايستنفدش اتصالات القاعدة — نص المخزن بالكتير، والباقي بيستنى دوره من غير اتصال",
      "ms": 1343.2951,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10083.582,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-2: من غير الجدول الحوار «مش متاح» والتعليق مرفوض برسالته؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده التعليق بيتكتب من غير إعادة تشغيل",
      "ms": 3816.0476,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-3: آمن للتكرار",
      "ms": 875.1018,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a transfer the administrator files on behalf is approved at once and stores the dated branch and its actual approver while past computeDay retains the historical branch",
      "ms": 11462.3282,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a future transfer approved at once changes no employee or org version before its date and concurrent scheduler runs apply it once with the instant approver",
      "ms": 370.5485,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "owner-configured automatic transfer records an explicit automatic decision used by scheduled org history",
      "ms": 333.5162,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a financially closed day rolls back transfer, employee, account and approval together — at instant approval and at a pending decision alike",
      "ms": 985.0423,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "cross-branch creator and approver cannot bypass scope to move the employee or append org history",
      "ms": 237.4836,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 10177.6787,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 290.0999,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 44.2711,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 251.5063,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 277.9451,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_comments_test_a1c8abfae92df3a8 is absent from sys.databases.",
    "Cleanup verified: hr_comments_migration_test_71c034091ed972e7 is absent from sys.databases.",
    "تم التحقق من حذف قاعدة الاختبار: hr_calendar_transfer_test_d7281f74e1753ed1",
    "تم التحقق من حذف مرفقات الاختبار المؤقتة.",
    "Cleanup verified: hr_audit_log_test_0d50bd23db66347b is absent from sys.databases.",
    "tests 23",
    "suites 0",
    "pass 23",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 82908.5217"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_test_a1c8abfae92df3a8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_test_a1c8abfae92df3a8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_migration_test_71c034091ed972e7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_migration_test_71c034091ed972e7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_calendar_transfer_test_d7281f74e1753ed1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_calendar_transfer_test_d7281f74e1753ed1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_0d50bd23db66347b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_0d50bd23db66347b\"}\n"
  ]
}
