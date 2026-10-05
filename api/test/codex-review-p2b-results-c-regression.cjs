module.exports = {
  "selected": [
    "payroll-live",
    "payroll-daily-accrual",
    "queue-outbox",
    "one-person-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 33,
      "failed": 0,
      "passed": 33,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 33,
      "suites": 0
    },
    "duration_ms": 61920.4886
  },
  "results": [
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-01: المعاينة قبل أي حساب — الموظفين ظاهرين و«لسه ماتحسبش»، بصلاحية الرواتب وبنطاق الفرع",
      "ms": 8395.0617,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-02: «حدّث الحساب» بنطاق الحساب — مجموع كل موظف = مجموع صفوف تراكمه بالقرش، والتأخير والغياب بمبالغهم، وإجمالي الفرع والعملة",
      "ms": 1071.8067,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-03: مهمة الليل بتحسب للموظف اللي مالوش مسير مفتوح؛ الإعداد المقفول = موظفو المسيرات المفتوحة بس؛ وإعادة التشغيل مابتحسبش تاني",
      "ms": 556.9594,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-04: يوم اتعلّم متسخ ← مهمة في الطابور ← اتنفذت ← المعاينة اتغيرت؛ والتعديلات المتتالية مهمة واحدة بوقت UTC صح",
      "ms": 436.6297,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-05: «مستحقي التقديري» للموظف — الميزة مقفولة 404، ومفتوحة أرقامه هو بس ومطابقة لصف المعاينة",
      "ms": 112.7422,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-06: المهمة مابتعيدش حساب يوم مقفول — صف مسيره معتمد أو مصروف، أو من غير مسير مفتوح والموظف ليه في فترته مسير عادي معتمد؛ والمفتوح والملغى والتكميلي بيتعادوا",
      "ms": 490.4872,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-07: سباق معاملتين على نفس مفتاح المهمة — التانية بتستنى وبترجع false ومعاملتها سليمة، بالعزل الافتراضي وبـRCSI (الفهرس الفريد هو الحكم)",
      "ms": 1521.2598,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-08: «حدّث الحساب» بميزانية وقت — كل طلب بيحسب اللي يلحقه ويقول الباقي، وبيحسب الناقصين بس، والتقدّم مضمون",
      "ms": 1299.7956,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-09: موديول الرواتب مقفول = مهمة إعادة الحساب مابتحسبش (زي مهمة الليل)، ولما يتفتح اليوم بيتحسب",
      "ms": 159.2837,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-01: المسير المحسوب من الأيام المتراكمة يطابق المحسوب من الصفر بندًا ببند",
      "ms": 14311.7162,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-02: تغيير بأثر رجعي يعلّم يومه «متسخ» فقط، والنتيجة تفضل مطابقة لإعادة الحساب الكاملة",
      "ms": 2578.4639,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-03: بصمة المدخلات تمسك التغيير حتى لو محدش علّم اليوم متسخ",
      "ms": 1431.5962,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-04: الجار الليلي آمن لإعادة التشغيل ولا يلمس مسيرًا معتمدًا",
      "ms": 1851.9082,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف",
      "ms": 4088.8163,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل",
      "ms": 1116.3524,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش",
      "ms": 7321.0638,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام",
      "ms": 102.37,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها",
      "ms": 125.9837,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع",
      "ms": 149.8628,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها",
      "ms": 2358.5462,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس",
      "ms": 30.33,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-0: الإعدادات الأربعة مبذورة مقفولة ومسموح بيها في الإعدادات (true/false بس)",
      "ms": 6926.4753,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-1: سجل تغييرات الصرف — الملف وExcel والطلب والإنشاء بصف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي، ومن غير صف لو ماتغيرش",
      "ms": 616.8909,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2: «اتغيّر إيه من آخر مسير» — الراتب قبل وبعد، وتغيير الراتب والآيبان بمين وإمتى، والجديد، والخارج، وبنطاق الفرع",
      "ms": 3868.0978,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2b (CRP1-B01): موظف اتنقل من فرع تاني — قارئ الفرع مايشوفش شهر مسيره هناك ولا راتبه ولا شهر السلسلة، وحساب الشركة بيشوف",
      "ms": 1781.9348,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2c (CRP1-B01): مسير أحدث في فرع تاني وأقدم في فرع القارئ — المقارنة بالأقدم المرئي، والموظف نفسه بيشوف مسيره هناك",
      "ms": 3248.8202,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2d (CRP1-B01): نفس اسم السلسلة في فرعين — قارئ الفرع بياخد آخر مسير من فرعه وخارجينه، ومايشوفش شهر مسير الفرع التاني",
      "ms": 3413.6324,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2e (CRP1R-N01): مسيرات مخفية كتير بنفس اسم السلسلة ماتزاحمش المسير المرئي — 60 مسير أحدث في فرع تاني والخارج لسه ظاهر",
      "ms": 1490.0886,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2f (B1.14): تنبيهات قبل الاعتماد — الصافي اتغيّر بالنسبة أو أكتر ببنوده، وتحت النسبة لأ، والنسبة 0 بتقفله، والصافي صفر أو سالب، وبمسير مقارنة القارئ",
      "ms": 618.5381,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-3: «اللي غيّر مايعتمدش لوحده» — مقفول زي النهارده؛ مفتوح رفض برسالة، وحد تاني بيعتمد، ومدير النظام بسبب بيعدّي ويتسجل",
      "ms": 4214.9844,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-4: نفس الضابط في سلسلة الاعتماد — معتمد تاني قبله بيعدّي ويتسجل؛ سلسلة بخطوة واحدة رفض، ومدير النظام بسبب بيعدّي",
      "ms": 3357.3317,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-5: المسار الأمني للحساب البنكي — مقفول زي النهارده؛ مفتوح التعديل وExcel مرفوضين للآيبان والبنك، والطلب نيابةً في سلسلته، ونفس الشخص مايعتمدش الخطوتين",
      "ms": 330.2861,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-6: فحوص النقل من التعديل وExcel — مقفول زي النهارده؛ مفتوح العهدة المفتوحة أو المدير في فرع تاني بيمنع النقل من غير أي تغيير",
      "ms": 379.4722,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"window\":{\"period\":\"2026-10\",\"startDate\":\"2026-09-23\",\"endDate\":\"2026-10-22\",\"upTo\":\"2026-10-04\",\"today\":\"2026-10-05\"},\"lateDay\":\"2026-09-23\",\"absentDay\":\"2026-09-24\"}",
    "lock-free enqueue: duplicate key under locking read committed and under RCSI returns false and leaves the second transaction usable",
    "Cleanup verified: hr_payroll_live_rcsi_test_84090238b78e4254 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_live_test_4f86c0eb332c77ed is absent from sys.databases.",
    "نفس totalNet ونفس كل بند وتفصيله في المسارين",
    "Cleanup verified: hr_payroll_accrual_test_f6941b98f8dee0e6 no longer exists in sys.databases.",
    "Cleanup verified: hr_queue_outbox_test_df8348dfcaa120dc is absent from sys.databases.",
    "Cleanup verified: hr_one_person_test_0a6eee1137d8ef5b is absent from sys.databases.",
    "tests 33",
    "suites 0",
    "pass 33",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 61920.4886"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_live_test_4f86c0eb332c77ed\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_live_rcsi_test_84090238b78e4254\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_live_rcsi_test_84090238b78e4254\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_live_test_4f86c0eb332c77ed\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_accrual_test_f6941b98f8dee0e6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_accrual_test_f6941b98f8dee0e6\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_outbox_test_df8348dfcaa120dc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_outbox_test_df8348dfcaa120dc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_one_person_test_0a6eee1137d8ef5b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_one_person_test_0a6eee1137d8ef5b\"}\n"
  ]
}
