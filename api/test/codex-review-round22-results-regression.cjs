module.exports = {
  "selected": [
    "org-filter-context",
    "financial-report",
    "payroll-approval-chain-disbursement",
    "disbursed-recorded-split"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 24,
      "failed": 0,
      "passed": 24,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 24,
      "suites": 0
    },
    "duration_ms": 48144.4013
  },
  "results": [
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-01: حساب فرع النصر — فرعه ووحداته وفرقه المفعّلة وموظفينه بكل حالاتهم، ومفيش رقم ولا اسم من فرع برّه نطاقه",
      "ms": 6052.5607,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-02: حساب الشركة كلها ومدير النظام — كل الفروع المفعّلة، والإدارة التنفيذية ظاهرة أب لأقسام الفروع التانية",
      "ms": 23.608,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-03: حساب فرعين (الرئيسي والنصر) — الأب في فرع جوه نطاقه بيظهر، والمعادي لأ",
      "ms": 13.0126,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-04: الصلاحية — أي صلاحية عرض شاشة فيها الفلتر تكفي، ومن غيرها 403، والحساب بلا فرع نطاقه فاضي",
      "ms": 19.0237,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-05: تضييق الخادم بمعاملات الفلتر — جوه النطاق بس، والبرّه مابيرجّعش حاجة، والقيمة الغلط 400",
      "ms": 125.9282,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-06: أعداد الطلبات — صاحب طلب قديم اتنقل لفرع برّه النطاق قسمه وفريقه الجداد مايبانوش من العدد (CR21-B01)",
      "ms": 98.6766,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 6156.8905,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 33.3381,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 51.9531,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 29.4554,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7666.0687,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 148.0815,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 3736.1738,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 4646.541,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 800.1986,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 939.8919,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 484.4193,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 626.047,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 384.4878,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 108.6863,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-01: البند المصروف نقدي يفضل نقدي في الشاشات الأربع بعد ما الملف بقى «تحويل بنكي»، واللي لسه ماتصرفش بيتبع الملف",
      "ms": 6125.1639,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-02: مسير اتصرف كله مرة واحدة بلا علامات بياخد لقطة البند، و«لم يتم» ترجّع الصف لملف الموظف",
      "ms": 116.9623,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-03: القسيمة تقول اللي اتصرف فعلًا — نقدي بعد ما الملف بقى «تحويل بنكي»، وبند بلا علامة يتبع الملف",
      "ms": 106.2959,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-04: التقسيم المثبت وقت الصرف يغلب الملف الحالي ولقطة الحساب في الخمس شاشات، وتعديل الملف بعده مابيغيّرش حاجة",
      "ms": 304.3289,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_org_filter_test_29c969ad959cff26 is absent from sys.databases.",
    "Cleanup verified: hr_financial_report_test_88725d2753d9ac32 is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_3ae5ec10b9694c50 is absent from sys.databases.",
    "Cleanup verified: hr_recorded_split_test_9b03d4d1197cc9cc is absent from sys.databases.",
    "tests 24",
    "suites 0",
    "pass 24",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 48144.4013"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_org_filter_test_29c969ad959cff26\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_org_filter_test_29c969ad959cff26\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_financial_report_test_88725d2753d9ac32\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_financial_report_test_88725d2753d9ac32\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_3ae5ec10b9694c50\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_3ae5ec10b9694c50\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recorded_split_test_9b03d4d1197cc9cc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recorded_split_test_9b03d4d1197cc9cc\"}\n"
  ]
}
