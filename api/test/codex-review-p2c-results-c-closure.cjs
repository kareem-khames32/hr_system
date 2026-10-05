module.exports = {
  "selected": [
    "codex-review-p2c-live",
    "codex-review-p2c-live-controls",
    "payroll-live",
    "payroll-daily-accrual",
    "one-person-controls",
    "queue-outbox"
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
    "duration_ms": 136201.1269
  },
  "results": [
    {
      "file": "codex-review-p2c-live.integration.cjs",
      "name": "P2B C calculation-only refresh must not return payroll amounts hidden by GET",
      "ms": 5296.7055,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-live.integration.cjs",
      "name": "P2B C the latest day alone must not mark a partially accumulated period complete",
      "ms": 534.6059,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-live.integration.cjs",
      "name": "P2B C a refresh chosen before real payroll approval must not rewrite its accrual afterward",
      "ms": 1243.6586,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-live-controls.integration.cjs",
      "name": "P2B C mine cannot be enabled or redirected by caller supplied employee or feature values",
      "ms": 7055.2767,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-live-controls.integration.cjs",
      "name": "P2B C invalid settings are rejected; corrupt stored values use documented safe behavior",
      "ms": 72.1654,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-live-controls.integration.cjs",
      "name": "P2B C adding a hidden previous payroll cannot change alerts or change counters",
      "ms": 264.2008,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-01: النسبة من الإعداد — عدد صحيح من 0 لـ1000، وغيره = الافتراضي 20",
      "ms": 0.2385,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-02: الفرق قد النسبة أو أكتر ← تنبيه بالبنود اللي فرقت بس؛ تحت النسبة أو من غير فرق ← مفيش",
      "ms": 0.2484,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-03: السابق صفر أو سالب = أي فرق تنبيه من غير نسبة؛ النسبة 0 = مقفول؛ ومن غير بند سابق أو حالي ← مفيش",
      "ms": 0.1101,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-01: المعاينة قبل أي حساب — الموظفين ظاهرين و«لسه ماتحسبش»، بصلاحية الرواتب وبنطاق الفرع",
      "ms": 7809.1308,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-02: «حدّث الحساب» بنطاق الحساب — مجموع كل موظف = مجموع صفوف تراكمه بالقرش، والتأخير والغياب بمبالغهم، وإجمالي الفرع والعملة",
      "ms": 1064.5783,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-03: مهمة الليل بتحسب للموظف اللي مالوش مسير مفتوح؛ الإعداد المقفول = موظفو المسيرات المفتوحة بس؛ وإعادة التشغيل مابتحسبش تاني",
      "ms": 500.2413,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-04: يوم اتعلّم متسخ ← مهمة في الطابور ← اتنفذت ← المعاينة اتغيرت؛ والتعديلات المتتالية مهمة واحدة بوقت UTC صح",
      "ms": 464.5119,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-05: «مستحقي التقديري» للموظف — الميزة مقفولة 404، ومفتوحة أرقامه هو بس ومطابقة لصف المعاينة",
      "ms": 111.9602,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-06: المهمة مابتعيدش حساب يوم مقفول — صف مسيره معتمد أو مصروف، أو من غير مسير مفتوح والموظف ليه في فترته مسير عادي معتمد؛ والمفتوح والملغى والتكميلي بيتعادوا",
      "ms": 484.2831,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-07: سباق معاملتين على نفس مفتاح المهمة — التانية بتستنى وبترجع false ومعاملتها سليمة، بالعزل الافتراضي وبـRCSI (الفهرس الفريد هو الحكم)",
      "ms": 1470.1116,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-08: «حدّث الحساب» بميزانية وقت — كل طلب بيحسب اللي يلحقه ويقول الباقي، وبيحسب الناقصين بس، والتقدّم مضمون",
      "ms": 1503.3378,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-09: موديول الرواتب مقفول = مهمة إعادة الحساب مابتحسبش (زي مهمة الليل)، ولما يتفتح اليوم بيتحسب",
      "ms": 142.9753,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-10 (CRP2B-C-B01): صلاحية الحساب من غير صلاحية العرض — «حدّث الحساب» بيحسب وبيرجّع أعداد بس، من غير أسماء ولا مبالغ",
      "ms": 496.2843,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-11 (CRP2B-C-B03): «مكتمل» = كل أيام الفترة المطلوبة موجودة — آخر يوم لوحده، ويوم ناقص في النص، وتاريخ التعيين",
      "ms": 1083.7078,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live.integration.cjs",
      "name": "LV-12 (CRP2B-C-B02): الإقفال بيتفحص جوه المعاملة تحت قفل الموظف المالي — مسير اتعتمد بين الاختيار والكتابة مابيتكتبش على أيامه",
      "ms": 5504.4328,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-01: المسير المحسوب من الأيام المتراكمة يطابق المحسوب من الصفر بندًا ببند",
      "ms": 12594.4034,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-02: تغيير بأثر رجعي يعلّم يومه «متسخ» فقط، والنتيجة تفضل مطابقة لإعادة الحساب الكاملة",
      "ms": 2028.0543,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-03: بصمة المدخلات تمسك التغيير حتى لو محدش علّم اليوم متسخ",
      "ms": 1106.2278,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-04: الجار الليلي آمن لإعادة التشغيل ولا يلمس مسيرًا معتمدًا",
      "ms": 1515.1137,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف",
      "ms": 3980.8033,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل",
      "ms": 1021.4023,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-0: الإعدادات الأربعة مبذورة مقفولة ومسموح بيها في الإعدادات (true/false بس)",
      "ms": 7661.1977,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-1: سجل تغييرات الصرف — الملف وExcel والطلب والإنشاء بصف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي، ومن غير صف لو ماتغيرش",
      "ms": 754.7296,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2: «اتغيّر إيه من آخر مسير» — الراتب قبل وبعد، وتغيير الراتب والآيبان بمين وإمتى، والجديد، والخارج، وبنطاق الفرع",
      "ms": 5071.567,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2b (CRP1-B01): موظف اتنقل من فرع تاني — قارئ الفرع مايشوفش شهر مسيره هناك ولا راتبه ولا شهر السلسلة، وحساب الشركة بيشوف",
      "ms": 1772.767,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2c (CRP1-B01): مسير أحدث في فرع تاني وأقدم في فرع القارئ — المقارنة بالأقدم المرئي، والموظف نفسه بيشوف مسيره هناك",
      "ms": 4223.9441,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2d (CRP1-B01): نفس اسم السلسلة في فرعين — قارئ الفرع بياخد آخر مسير من فرعه وخارجينه، ومايشوفش شهر مسير الفرع التاني",
      "ms": 4307.4154,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2e (CRP1R-N01): مسيرات مخفية كتير بنفس اسم السلسلة ماتزاحمش المسير المرئي — 60 مسير أحدث في فرع تاني والخارج لسه ظاهر",
      "ms": 1572.0126,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2f (B1.14): تنبيهات قبل الاعتماد — الصافي اتغيّر بالنسبة أو أكتر ببنوده، وتحت النسبة لأ، والنسبة 0 بتقفله، والصافي صفر أو سالب، وبمسير مقارنة القارئ",
      "ms": 654.5387,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-3: «اللي غيّر مايعتمدش لوحده» — مقفول زي النهارده؛ مفتوح رفض برسالة، وحد تاني بيعتمد، ومدير النظام بسبب بيعدّي ويتسجل",
      "ms": 5800.806,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-4: نفس الضابط في سلسلة الاعتماد — معتمد تاني قبله بيعدّي ويتسجل؛ سلسلة بخطوة واحدة رفض، ومدير النظام بسبب بيعدّي",
      "ms": 3078.1204,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-5: المسار الأمني للحساب البنكي — مقفول زي النهارده؛ مفتوح التعديل وExcel مرفوضين للآيبان والبنك، والطلب نيابةً في سلسلته، ونفس الشخص مايعتمدش الخطوتين",
      "ms": 406.139,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-6: فحوص النقل من التعديل وExcel — مقفول زي النهارده؛ مفتوح العهدة المفتوحة أو المدير في فرع تاني بيمنع النقل من غير أي تغيير",
      "ms": 455.9808,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش",
      "ms": 6841.5674,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام",
      "ms": 92.0686,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها",
      "ms": 111.5357,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع",
      "ms": 134.1122,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها",
      "ms": 2236.8441,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس",
      "ms": 28.6614,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"live-refresh-permission\",\"getStatus\":403,\"postStatus\":201}",
    "{\"case\":\"missing-earlier-days\",\"window\":{\"period\":\"2026-10\",\"startDate\":\"2026-09-23\",\"endDate\":\"2026-10-22\",\"upTo\":\"2026-10-04\",\"today\":\"2026-10-05\"},\"before\":{\"days\":1,\"complete\":false,\"earned\":300},\"refresh\":{\"computed\":11,\"remaining\":0},\"control\":{\"computed\":0,\"days\":12,\"earned\":3600}}",
    "{\"case\":\"refresh-after-approval\",\"status\":\"APPROVED\",\"computed\":0,\"beforeDirty\":true,\"afterDirty\":true,\"beforeEarnings\":200,\"afterEarnings\":200,\"changedRows\":0,\"totalNet\":6000,\"laterSalaryFixture\":true}",
    "{\"window\":{\"period\":\"2026-10\",\"startDate\":\"2026-09-23\",\"endDate\":\"2026-10-22\",\"upTo\":\"2026-10-04\",\"today\":\"2026-10-05\"},\"lateDay\":\"2026-09-23\",\"absentDay\":\"2026-09-24\"}",
    "lock-free enqueue: duplicate key under locking read committed and under RCSI returns false and leaves the second transaction usable",
    "Cleanup verified: hr_payroll_live_rcsi_test_ba2a8e09a269a37f is absent from sys.databases.",
    "Cleanup verified: hr_payroll_live_test_fe98d00fb99590cc is absent from sys.databases.",
    "نفس totalNet ونفس كل بند وتفصيله في المسارين",
    "Cleanup verified: hr_payroll_accrual_test_120b07d08c6c090c no longer exists in sys.databases.",
    "Cleanup verified: hr_one_person_test_ad86779eb95f394b is absent from sys.databases.",
    "Cleanup verified: hr_queue_outbox_test_c948d0ff1d6949c4 is absent from sys.databases.",
    "tests 45",
    "suites 0",
    "pass 45",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 136201.1269"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_live_test_8462897a379610d7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_live_test_8462897a379610d7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_live_test_8462897a379610d7\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_live_controls_test_f916f4cf92e99113\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_live_controls_test_f916f4cf92e99113\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_live_controls_test_f916f4cf92e99113\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_live_test_fe98d00fb99590cc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_live_rcsi_test_ba2a8e09a269a37f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_live_rcsi_test_ba2a8e09a269a37f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_live_test_fe98d00fb99590cc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_accrual_test_120b07d08c6c090c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_accrual_test_120b07d08c6c090c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_one_person_test_ad86779eb95f394b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_one_person_test_ad86779eb95f394b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_outbox_test_c948d0ff1d6949c4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_outbox_test_c948d0ff1d6949c4\"}\n"
  ]
}
