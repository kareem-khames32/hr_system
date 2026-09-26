module.exports = {
  "selected": [
    "payroll-salary-change",
    "payroll-salary-request",
    "payroll-run-salary-period",
    "employee-bulk-update",
    "holiday-work"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 75423.5
  },
  "results": [
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "salary metadata uses employees.edit + payroll.approve authority, branch scope and exact SQL amounts",
      "ms": 5172.4916,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "nonfinancial PATCH never rewrites huge or nullable salary values and needs no history date",
      "ms": 70.0698,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "unchanged legacy financial fields may accompany other edits; changed fields need dated command",
      "ms": 85.3915,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "profile salary update atomically records all seven values (six + work pressure), currency, effective date and real actor",
      "ms": 152.943,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "first-change prior salary coverage requires explicit confirmation month and retains the exact old values",
      "ms": 83.1641,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "later-month profile salary is rejected without changing current salary or history",
      "ms": 87.1266,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "a daily-dated salary history must be converted to payroll months before a profile change",
      "ms": 96.9277,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "nested salary DTO rejects missing, numeric, negative and subcent values plus impossible dates atomically",
      "ms": 126.5974,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "two concurrent profile changes from one context allow exactly one save",
      "ms": 76.7425,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "stale current salary and stale history revision each reject without lost updates",
      "ms": 93.5285,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "history insertion failure rolls salary, audit and accompanying nonfinancial update back together",
      "ms": 64.5734,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "a rejected attachment after salary persistence rolls back salary, history, audit and profile together",
      "ms": 79.3227,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "salary writes and audit preserve SQL decimal cents beyond JavaScript safe integers",
      "ms": 68.2067,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "approved membership and paid items prevent retrospective salary changes without touching payroll",
      "ms": 242.5926,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "excluded member without a payslip does not block an otherwise open salary date",
      "ms": 59.6605,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "settled employment blocks changing the salary of that settled service",
      "ms": 57.7917,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "editing a historical payroll month preserves later monthly decisions and the correct current salary",
      "ms": 135.4801,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "salary drift outside a documented history requires reconciliation before another profile change",
      "ms": 94.5291,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "resending the identical current period with refreshed context makes no duplicate history or audit",
      "ms": 97.8824,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "missing history schema explains the prerequisite while nonfinancial edits continue to work",
      "ms": 229.5536,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-change.integration.cjs",
      "name": "dated schedule and status changes retain existing behavior without round-tripping salary amounts",
      "ms": 114.1212,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP catalog upgrades salary fields without changing the stored request catalog",
      "ms": 5317.3191,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP salary payload rejects missing or daily-dated payroll months, numeric money and forged server metadata before creating a draft",
      "ms": 88.8853,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP final approval writes one payroll-month salary revision with six exact amounts and actual HR actor",
      "ms": 219.6256,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "server-derived ten percent retains executive approval despite forged caller percentage; scope cannot bypass it and only HR authority may push the executive step",
      "ms": 253.8308,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "next-month approved request leaves salary and history unchanged until its payroll cycle starts, then runs once",
      "ms": 177.3495,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "salary source drift rolls back final approval and returning/resubmitting rebuilds the source basis",
      "ms": 164.685,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "employee branch drift and cross-branch submission cannot change financial data",
      "ms": 83.1676,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "legacy request without a payroll month cannot be approved implicitly and can be returned for explicit monthly resubmission",
      "ms": 144.6513,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "resubmission with owner-configured auto approval records the current actor rather than an older approval",
      "ms": 255.8353,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "concurrent final approval and retry leave one salary revision and one financial audit",
      "ms": 120.4143,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "request execution preserves cents above safe integer range in current salary, history and audit",
      "ms": 108.7691,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "authorized rejection recovers a stale future salary request without reversing money or allowing scheduled execution",
      "ms": 263.6538,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "rejection guard refuses a scheduled-status salary request with any existing financial reference",
      "ms": 115.379,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "rejection guard also refuses legacy APPROVED salary status when its financial change already exists",
      "ms": 124.6214,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "administrative rejection cannot use request ownership or wildcard permissions to cross the request branch",
      "ms": 160.0182,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "Owner 26-Sep: an increase HR files on behalf is approved and applied at once for the current payroll month, with HR as actor in history, audit and approval evidence",
      "ms": 72.4415,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "Owner 26-Sep: an HR increase above the executive threshold passes every conditional step at once; a next-month one is scheduled with the HR decision and applied when its cycle starts",
      "ms": 159.2342,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "Owner 26-Sep: a salary basis problem refuses the HR instant approval as a whole — no draft, no decision, no money",
      "ms": 38.6967,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "salary requests do not create payroll, attendance, overtime, loans or offboarding effects",
      "ms": 12.9545,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: 9,000 ثم 10,000 من سبتمبر — أغسطس بعد الزيادة 9,000، وسبتمبر 10,000 ويبقى 10,000 بعد زيادة أكتوبر ثم يُعتمد",
      "ms": 7944.1544,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: الاعتماد يقارن راتب شهر المسير نفسه — زيادة شهر لاحق أو تصحيح شهر آخر لا يوقفه، وتغيير عملة أو مبلغ الشهر نفسه يوقفه",
      "ms": 2538.4182,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: إنشاء الموظف يوثّق أجر التعيين «يسري من راتب شهر» فيدخل أول مسير بلا توثيق منفصل؛ الحدود والعملة تُفحص قبل الحفظ",
      "ms": 1196.4816,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13 / LOT-15: يوم إضافي في أغسطس يُعتمد بعد زيادة سبتمبر يُسعّر على 9,000، ويوم 23 أغسطس يتبع راتب سبتمبر",
      "ms": 83.7194,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: بلا دليل لشهر المسير يُستبعد الموظف بسبب ظاهر ولا يُوقف المسير؛ الوضع الانتقالي يوسم راتب الملف «غير موثق»",
      "ms": 3490.3296,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 14: دورة 31 — اعتماد فبراير لا يمنع مارس (لا PAYRUN-DUP-002)، وتغيير الدورة يُظهر الفجوة على المسير",
      "ms": 2942.978,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "قاعدة المالك: ملتحق في اليوم العاشر من الدورة — التغطية من تاريخ التعيين، لا غياب ولا خصم قبله، والتناسب 22/30 (الشهر 30 يومًا)",
      "ms": 1093.5269,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 9 (مسار R2): راتب صفري — من السجل الشهري أو من الملف في الوضع الانتقالي — يُستبعد NO_SALARY_DEFINED ولا يدخل بصافي صفر",
      "ms": 878.7443,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "القالب: CSV بعناوين الحقول المختارة ومملي بموظفين النطاق بس، وأعمدة الراتب محتاجة اعتماد المسير",
      "ms": 5566.5561,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "المعاينة مابتحفظش: التغيير القديم ← الجديد والأخطاء، وقاعدة البيانات زي ما هي",
      "ms": 23.8537,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "تغيير الراتب من الملف: مراجعة جديدة في سجل الأجر المؤرخ + سجل تغييرات، والسبب والمرجع إجباريين",
      "ms": 173.051,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "رقم بصمة مكرر مرفوض (مع موظف تاني أو صفين في الملف)، والصفوف السليمة بتتحفظ",
      "ms": 130.4148,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "عزل الفرع: موظف فرع تاني صف خطأ، والنقل لفرع تاني مرفوض لحساب الفرع",
      "ms": 38.2161,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "نقل الفرع من الملف: بتاريخ سريان وسبب، يتسجل في سجل فرع الموظف وسجل التغييرات",
      "ms": 115.346,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "Excel: القالب المملي يتنزل ويتعدل ويترفع، والتطبيق على دفعات بأرقام الصفوف",
      "ms": 198.4119,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 6189.054,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 7448.7163,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1103.0333,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 179.0129,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 1075.7825,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1245.838,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 4471.7319,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_salary_change_test_a3e36a8f5c77feba removed.",
    "Cleanup verified: temporary uploads removed.",
    "تم التحقق من حذف قاعدة الاختبار: hr_payroll_salary_request_test_1f0501caf73abc05",
    "تم التحقق من حذف مجلد مرفقات الاختبار المؤقت.",
    "أغسطس 9,000 قبل وبعد الزيادة؛ سبتمبر 10,000 قبل وبعد زيادة أكتوبر ثم اعتُمد",
    "EGP لمارس → 409؛ 10,500 لمارس → 409؛ مراجعة 4 (زيادة أبريل + تصحيح فبراير) ومارس 10,000 → 201 بلا إعادة حساب",
    "إنشاء بتعيين 2026-09-23: مراجعة شهرية 1 من 2026-10 ومشمول في المسير بـ6,000+1,000؛ القديم افتراضيًا من 2026-10؛ الرفض يرجّع الملف",
    "فبراير 31/1→28/2 معتمد، مارس 1/3→30/3 محسوب ومعتمد بلا تعارض، وفجوة 31 مارس ظاهرة على مسير أبريل",
    "ملتحق 1 أغسطس (اليوم العاشر): 9000×22/30=6600 على أساس 30 يومًا، غياب 11 أغسطس فقط، لا صفوف قبل التعيين حتى مع بداية فعلية بعد تاريخ الالتحاق",
    "راتب شهري 0.00 وملف بمكونات صفرية/فارغة: مستبعدان NO_SALARY_DEFINED في الوضعين، والموثق وحده في البنود",
    "Cleanup verified: hr_run_salary_period_test_66236ec3c68f9faf removed.",
    "Cleanup verified: hr_bulk_update_test_55b73d1e195371ef is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_5e018cfd6de3c23f is absent from sys.databases.",
    "tests 62",
    "suites 0",
    "pass 62",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 75423.5"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_salary_change_test_a3e36a8f5c77feba\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_salary_change_test_a3e36a8f5c77feba\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_salary_request_test_1f0501caf73abc05\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_salary_request_test_1f0501caf73abc05\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_run_salary_period_test_66236ec3c68f9faf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_run_salary_period_test_66236ec3c68f9faf\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_bulk_update_test_55b73d1e195371ef\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_bulk_update_test_55b73d1e195371ef\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_5e018cfd6de3c23f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_5e018cfd6de3c23f\"}\n"
  ]
}
