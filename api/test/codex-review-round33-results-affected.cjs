module.exports = {
  "selected": [
    "payroll-allowances",
    "payroll-approval-chain-disbursement"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 15,
      "failed": 0,
      "passed": 15,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 15,
      "suites": 0
    },
    "duration_ms": 34864.0726
  },
  "results": [
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
      "ms": 5953.0689,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
      "ms": 2310.6235,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
      "ms": 1193.5589,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
      "ms": 159.2997,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR32-B01: مسير فرع تاني للموظف بعد نقله مايظهرش لحساب الفرع في ردود البدل وقايمته، ومسير فرعه بيظهر",
      "ms": 886.0922,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7232.704,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 177.7527,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4296.6623,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 4356.8874,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 851.177,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 814.6897,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 484.1596,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 647.2408,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 450.2747,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 108.1808,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payroll_allowances_test_a052f3e54ae51dcc is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_5033c25b11f1a1ee is absent from sys.databases.",
    "tests 15",
    "suites 0",
    "pass 15",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 34864.0726"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_allowances_test_a052f3e54ae51dcc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_allowances_test_a052f3e54ae51dcc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_5033c25b11f1a1ee\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_5033c25b11f1a1ee\"}\n"
  ]
}
