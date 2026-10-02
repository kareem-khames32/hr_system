module.exports = {
  "selected": [
    "codex-review-round23-ui-dates"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 12,
      "failed": 0,
      "passed": 12,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 12,
      "suites": 0
    },
    "duration_ms": 3903.0349
  },
  "results": [
    {
      "file": "financial-report-ui.test.cjs",
      "name": "every financial report has its own screen with the shared filters, Excel export and print, titled like its link",
      "ms": 4.0549,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "the reports hub and the payroll reports page link all financial reports, and the cost-center report stays linked",
      "ms": 1.2563,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-01: خطوات السلسلة تتنضف وتترتب، وأسماء الخطوات الافتراضية «مراجعة N» والأخيرة «الاعتماد النهائي»",
      "ms": 1.5036,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-02: بصمة السلسلة = هوية المعتمدين بترتيبهم؛ اسم الخطوة برّاها، وأي تغيير في شخص أو ترتيب يغيّرها",
      "ms": 0.5673,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-03: التقدم — الخطوات بالترتيب، والمسير يفضل منتظر صاحب أول خطوة مش معتمدة",
      "ms": 0.571,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-04: القرارات تخص نسخة حساب واحدة وبصمة سلسلة واحدة — نسخة أقدم أو قرار ملغى أو بصمة قديمة لا تُحتسب",
      "ms": 0.1963,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-05: الرفض بسبب يرجّع نسخة الحساب لمسؤول الرواتب — مفيش خطوة حالية، وتغيير السلسلة مايمسحش الرفض",
      "ms": 0.3771,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-06: مسير معتمد أو مصروف — الشريط من القرارات نفسها (تاريخ ثابت مهما اتغيرت السلسلة)، ومسير اتعتمد بخطوة واحدة بلا شريط",
      "ms": 0.2685,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-07: صاحب الخطوة — الشخص المسمّى برقمه، والدور بكود دور التوكن",
      "ms": 0.1868,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-07b: حل سلسلة المسير — الخاصة باسمه الدائم أولًا ثم سلسلة الشركة؛ سلسلة بلا خطوات = غير موجودة؛ بلا أي سلسلة = null (الاعتماد بخطوة واحدة)",
      "ms": 0.3859,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-08: خطافات المسير الكبير قليلة ومحددة — الاعتماد القديم يتحقق من السلسلة، وآخر خطوة تنادي approveLocked نفسها، والقسيمة على APPROVED/PAID كما هي",
      "ms": 2.7274,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-ui-dates.integration.cjs",
      "name": "CR23 shifted date fixtures preserve every March-December weekday and original payroll constants",
      "ms": 1.6957,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"future-calendar\",\"mappedYear\":2037,\"weekdayComparisons\":1530,\"lateLine\":270,\"permissionLine\":120,\"joinerAllowance\":733.33}",
    "tests 12",
    "suites 0",
    "pass 12",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 3903.0349"
  ],
  "stdout": []
}
