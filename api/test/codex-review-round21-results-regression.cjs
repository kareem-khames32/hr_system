module.exports = {
  "selected": [
    "financial-report",
    "cost-center-report",
    "payroll-overview-filters",
    "payroll-approval-chain-disbursement",
    "hiring-documents"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 26,
      "failed": 0,
      "passed": 26,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 26,
      "suites": 0
    },
    "duration_ms": 64115.1863
  },
  "results": [
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 7488.9851,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 48.0724,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 78.9401,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 59.9731,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 6620.4176,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 12.1473,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 43.052,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 7853.19,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1340.199,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 899.5702,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 472.3598,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7563.1917,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 152.2117,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 3880.8032,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 4369.214,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 757.632,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 846.0369,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 566.814,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 673.9973,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 375.9199,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 138.44,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-01: من غير نوع مطلوب التقرير فاضي ومفيش مهمة نظام؛ وعلامة «مطلوب للتعيين» بتتكتب من حساب الشركة بصلاحية الإعدادات بس",
      "ms": 5908.9564,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-02: الناقص = المطلوب المفعّل من غير مستند بملف (الانتهاء مش شرط)، للموظفين الشغالين، بالفرع والقسم؛ والبحث وفلتر الفرع",
      "ms": 156.6762,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-03: نطاق الفروع — حساب الفرع يشوف فرعه بس من غير تسريب، وبرّه النطاق 404 من غير تذكير جزئي، ومن غير الصلاحية 403",
      "ms": 97.3456,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-04: التذكير وإشعار «ناقصك من مسوغات التعيين» بالناقص الحالي — الشطب، والتذكير الجديد، والاختفاء لما يكتمل؛ و«المطلوب منّي»",
      "ms": 505.1144,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-05: مهمة «استلام مسوغات التعيين» — مع المهام وللموجودين مرة واحدة، بالتقدّم والناقص، ماتتقفلش والناقص موجود، وبتكتمل وترجع لوحدها",
      "ms": 650.5557,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_financial_report_test_8d4cb4f52545018a is absent from sys.databases.",
    "Cleanup verified: hr_cost_center_test_49d7b92fffa5c96c is absent from sys.databases.",
    "Cleanup verified: hr_payroll_overview_filters_test_c9525712ac6e4b01 is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_ced1aaf5eb89f224 is absent from sys.databases.",
    "Cleanup verified: hr_hiring_docs_test_8ca7a46e8d1281f5 is absent from sys.databases.",
    "tests 26",
    "suites 0",
    "pass 26",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 64115.1863"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_financial_report_test_8d4cb4f52545018a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_financial_report_test_8d4cb4f52545018a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_cost_center_test_49d7b92fffa5c96c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_cost_center_test_49d7b92fffa5c96c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_overview_filters_test_c9525712ac6e4b01\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_overview_filters_test_c9525712ac6e4b01\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_ced1aaf5eb89f224\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_ced1aaf5eb89f224\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_hiring_docs_test_8ca7a46e8d1281f5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_hiring_docs_test_8ca7a46e8d1281f5\"}\n"
  ]
}
