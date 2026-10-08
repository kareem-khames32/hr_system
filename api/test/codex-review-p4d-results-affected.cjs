module.exports = {
  "selected": [
    "employee-privacy",
    "employee-export",
    "employment-periods",
    "employment-periods-migration",
    "fulltest-employees-attendance"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 45,
      "failed": 0,
      "passed": 45,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 45,
      "suites": 0
    },
    "duration_ms": 72642.3161
  },
  "results": [
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-01: الإعداد مقفول (الافتراضي) — الهوية كاملة لكل من يشوف الموظف، والآيبان مشيول عن غير المصرّح له بالمالية، ومفيش خانات مخفية",
      "ms": 12817.5649,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-02: الإعداد مفتوح — الهوية والجواز بآخر 4 خانات لغير صاحب الملف واللي بيعدّل، والآيبان مخفي لغير المصرّح له بالمالية — في الملف والقايمة وملف Excel",
      "ms": 710.3517,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-03: تصدير بيانات الموظف — ملف الموظف وكل سجلاته، بصلاحية «تعديل الموظفين» وبنطاق الفروع، وبسطر تدقيق، ومن غير بيانات دخول",
      "ms": 569.2574,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-04 (P4A-B04): طلب بتعريف سري (نوعه العام مش سري) وأي سجل اتعمل منه برّه التصدير",
      "ms": 526.7154,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-05 (P4A-B05): التصدير ماسك صف الموظف من حكم النطاق لآخر قراءة — نقل الفرع بيستنى، والتصدير اللي بعده «غير موجود»",
      "ms": 530.0188,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-06 (P4B-B01): قيد دفتر مصدره طلب سري (sourceRequestId) وسلفة طلبها سري برّه التصدير؛ ونفس السجلات وطلبها مش سري جوّه",
      "ms": 643.6975,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-07 (P4B-N01): التصدير اللي SQL اختاره ضحية تعارض أقفال (1205) بيتعاد كله — مش 500",
      "ms": 115.6634,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-08 (P4C-B01): نص طلب سري اتنسخ بالتحديث لصف قديم أو لملف الموظف (سبب حذف معال، وصف فقد عهدة، سبب أرشفة) بيطلع محجوب في التصدير — وباقي الصف زي ما هو",
      "ms": 416.6597,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-09 (P4C-N02): أقساط السلف بتتصدّر عن طريق سلفتها — للي معاه البيانات المالية، وقسط سلفة طلبها سري برّه",
      "ms": 344.8059,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-01: كود البصمة تاني عمود، والأكواد والجوال والهوية نص بأصفارهم، والتواريخ زي ما هي، والأسماء بدل الأرقام",
      "ms": 10265.8233,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-02: من غير payroll.view ولا employees.edit مفيش أي عمود مالي — مش فاضي، مش موجود أصلًا",
      "ms": 36.0299,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-03: نطاق الفرع: موظف فرع تاني مابيطلعش حتى لو رقمه اتبعت، والترتيب زي الشاشة",
      "ms": 126.3336,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-04: من غير employees.view مرفوض، وقائمة فاضية أو أرقام غلط مرفوضة برسالة",
      "ms": 28.1109,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-05: التصدير GET (قراءة بس) ومتعرّف قبل «:id» — مش بيتقري كأنه رقم موظف",
      "ms": 0.4657,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-01: الإرجاع القديم — موظف ملفه مُصفّى بيرجع بسبب مكتوب بس والسبب في سجله، ومن غير تصفية زي ما هو",
      "ms": 11434.5582,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-02: إعادة تعيين بعد سنة — الفترة القديمة اتسجّلت، والمكافأة والرصيد ومعاينة التصفية زي موظف جديد بنفس التاريخ، والمسير والحضور من تاريخ المباشرة",
      "ms": 772.8437,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-03: الرفض — مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول، أكتر من نهاية، تاريخ أو سبب غلط، بدري أو بعيد، ومن غير الصلاحية أو برّه النطاق",
      "ms": 937.7861,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-04: المسير — المباشرة بعد شهر الرواتب اللي فيه آخر يوم عمل، ومسير الشهر ده معتمد والموظف فيه، ومسير قديم لسه مااتعتمدش بيمنع",
      "ms": 1136.1201,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-05: رصيد الإجازات بعد إعادة التعيين — إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل والإقفال والتجديد مابيشوفوش صفوف الفترة المقفولة",
      "ms": 1389.5667,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-06: إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح",
      "ms": 1747.3513,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-07: إجازة معتمدة بعد آخر يوم عمل بتمنع إعادة التعيين لحد ما تتلغى، وتاريخ جوه فترة مقفولة مالوش خصم، والخصم والإرجاع مابيستنوش صف موظف ممسوك",
      "ms": 546.2964,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-08: الترحيل السنوي والتجديد اليومي بيحكموا ويكتبوا وصف الموظف ممسوك — مُرحّل الفترة القديمة مايوصلش لرصيد الجديدة",
      "ms": 5258.0484,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-09: حساب المسير بيحكم على موظفيه ببيانات اتقرت بعد قفل المالية — إعادة تعيين اتثبّتت قبل القفل مابتتحسبش بحكم قديم",
      "ms": 329.0397,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-10: مرجع مسير مخفي عن القارئ مابيظهرش في قراءة الفترات ولا في رفض إعادة التعيين — لا شهره ولا نهايته",
      "ms": 328.0884,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-11: أثر تعديل الملف على الرصيد جوه معاملة التعديل وتحت صف الموظف — رصيد افتتاحي من الخدمة القديمة مابيوصلش للفترة الجديدة",
      "ms": 5190.8258,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-12: فحص الرصيد مابيكتبش صف، وصفوف السنة الناقصة تحت صف الموظف — صف بمفتاح ذكرى تعيين قديمة مابيتكتبش بعد إعادة التعيين",
      "ms": 2184.3041,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-13: معالج طلب بيحفظ كيان الموظف كله بيقراه وصفه مقفول — اعتماد طلب قديم عبر إعادة التعيين مابيرجّعش تاريخ التعيين القديم",
      "ms": 1642.9667,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10227.2477,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-2: من غير الجدول الفترات «مش متاحة» وإعادة التعيين مرفوضة برسالتها؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده الإجراء بيشتغل من غير إعادة تشغيل",
      "ms": 6219.1957,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-3: آمن للتكرار",
      "ms": 1090.3675,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ1 — مجموعة بيانات كاملة: كل قيمة أُرسلت ترجع كما هي عند القراءة",
      "ms": 8307.0778,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ2 — مصفوفة التحقق عند الإضافة: كل مدخل غلط يُرفض برسالة، والكود المرسل يُتجاهل",
      "ms": 438.3993,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ3 — توليد الكود متسلسل بلا فجوات ولا تكرار تحت الإنشاء المتزامن",
      "ms": 433.565,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ4 — عزل الفروع: حساب فرع أ لا ينشئ ولا يقرأ ولا يعدّل موظف فرع ب",
      "ms": 271.5162,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ5 — حدود التعديل والتعيين المستقبلي: التكرار يُرفض، والكود لا يُعدَّل، ولا غياب قبل التعيين",
      "ms": 1236.9549,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب1 — يوم عادي، تأخير، انصراف مبكر، وتأخير مغطى بإذن معتمد (بلا خصم)",
      "ms": 1122.3861,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب2 — غياب بلا طلب، غياب مغطى بإجازة معتمدة، وبصمة ناقصة",
      "ms": 1851.2324,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب3 — الساعة المرنة: النافذة تعفي داخلها، وبعدها التأخير كامل بلا سماحية مُضافة مرتين",
      "ms": 378.622,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب4 — دوام يوم عطلة: المكتشف من البصمة، وأمر HR يحوّله لبدل دوام العطلات بدل الإضافي ومرة واحدة",
      "ms": 1554.4893,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب5 — يوم داخل فترة إيقاف عن العمل: يُتخطى ولا يُحفظ غيابًا (فلا يُخصم مرتين)",
      "ms": 4068.7509,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب6 — إضافي بطلب معتمد: يُحتسب مرة واحدة، والمعتمد بعد قفل فترته يدخل أول مسير مفتوح بعده بلا تكرار",
      "ms": 3228.0352,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب7 — التقارير والملخص متسقة مع صفوف الأيام، وفلاتر «من/إلى» باليوم تختلف عن فلتر الشهر",
      "ms": 1920.9955,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب8 — فلاتر المدى على سجل الإضافي والكشف، وعزل الفرع في قراءة الحضور",
      "ms": 65.3315,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب9 — حواف: غياب مُجسَّد ثم إجازة معتمدة، حد السماحية بالضبط، وبصمة مستقبلية أو خارج الفرع",
      "ms": 3619.2048,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ج1 — موظف عادي (خدمة ذاتية): يشوف حضوره هو بس، ولا يقرأ غيره ولا التقارير",
      "ms": 333.1425,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_employee_privacy_test_f4574eb3056f8959 is absent from sys.databases.",
    "Cleanup verified: hr_employee_export_test_e753a4d9cf2c7326 is absent from sys.databases.",
    "Cleanup verified: hr_employment_periods_test_24ea7ee8ab70f03e is absent from sys.databases.",
    "Cleanup verified: hr_employment_periods_migration_test_d5a273062baf059e is absent from sys.databases.",
    "إنشاء بفرع خارج النطاق → HTTP 403، الفرع المحفوظ — (نطاق المستخدم 1، المرسل 2)",
    "إنشاء بفرع خارج النطاق وقسم داخل النطاق → HTTP 403، الفرع المحفوظ —",
    "تاريخ تعيين في المستقبل (2026-12-01) → HTTP 201 \"EMP-0015\"",
    "تاريخ تعيين بعد 100 سنة (2126-01-01) → HTTP 400 \"تاريخ التعيين أبعد من سنة من النهارده — راجع السنة\"",
    "قيد الإضافي بعد اعتماد المسير: status=APPROVED، payrollRunId=— (PAID تتسجّل عند الصرف لا الاعتماد)",
    "مسير الفترة التالية (2026-10) → HTTP 201",
    "Cleanup verified: hr_fulltest_attendance_test_9bf5f476cb9f1d4e is absent from sys.databases.",
    "tests 45",
    "suites 0",
    "pass 45",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 72642.3161"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_f4574eb3056f8959\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_f4574eb3056f8959\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_export_test_e753a4d9cf2c7326\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_export_test_e753a4d9cf2c7326\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_test_24ea7ee8ab70f03e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_test_24ea7ee8ab70f03e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_migration_test_d5a273062baf059e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_migration_test_d5a273062baf059e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_fulltest_attendance_test_9bf5f476cb9f1d4e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_fulltest_attendance_test_9bf5f476cb9f1d4e\"}\n"
  ]
}
