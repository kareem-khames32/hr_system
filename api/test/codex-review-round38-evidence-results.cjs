module.exports = {
  "target": "e28c17a8f157d7ede1c6be2b4828506f2cde4813",
  "productRange": "733480c..e28c17a",
  "relatedCodeLimit": "162d50e..e28c17a",
  "counts": {
    "tests": 215,
    "passed": 212,
    "failed": 3,
    "skipped": 0
  },
  "executions": [
    {
      "file": "codex-review-round38-results-previous37.cjs",
      "files": [
        "codex-review-round37-overtime",
        "codex-review-round37-payload"
      ],
      "counts": {
        "tests": 4,
        "failed": 0,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round38-results-affected.cjs",
      "files": [
        "payroll-reports",
        "payroll-corrections",
        "fulltest-reports",
        "fulltest-leaves-payroll",
        "overtime-auto-approve-period",
        "payroll-response-leaks",
        "user-branch-scopes",
        "payroll-overtime-request",
        "payroll-bonuses",
        "payroll-typed-deductions",
        "payroll-overview-filters",
        "security-permission-gaps"
      ],
      "counts": {
        "tests": 205,
        "failed": 0,
        "passed": 205,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 205,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round38-results-independent.cjs",
      "files": [
        "codex-review-round38-event-period",
        "codex-review-round38-unassigned"
      ],
      "counts": {
        "tests": 4,
        "failed": 2,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "file": "codex-review-round38-event-period.integration.cjs",
          "name": "CR38 overtime event must hide the foreign payment period as well as its numbers",
          "error": "The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n"
        },
        {
          "file": "codex-review-round38-unassigned.integration.cjs",
          "name": "CR38 unassigned top-level runs must exclude a wholly foreign historical membership after transfer",
          "error": "A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-round38-results-related.cjs",
      "files": [
        "codex-review-round38-related-periods"
      ],
      "counts": {
        "tests": 2,
        "failed": 1,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "file": "codex-review-round38-related-periods.integration.cjs",
          "name": "CR38 real bonus deduction and loan reversal: foreign references hidden",
          "error": "Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n"
        }
      ]
    }
  ],
  "finalCases": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 40761.3271,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-previous37.cjs"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 5888.3802,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-previous37.cjs"
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4578.4635,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-previous37.cjs"
    },
    {
      "file": "codex-review-round37-payload.integration.cjs",
      "name": "CR37 scopeRunRefRows: nested references, Date values, allowed identity and immutable source",
      "ms": 1.641,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-previous37.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
      "ms": 12260.1376,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "detailed payroll reports require payroll.view on top of reports.view",
      "ms": 38.3924,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
      "ms": 464.0761,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
      "ms": 127.9041,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
      "ms": 104.0619,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "variance report explains each employee difference by component and isolates unexplained residuals",
      "ms": 76.9412,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
      "ms": 2807.6119,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
      "ms": 413.5258,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
      "ms": 183.3893,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 14626.8588,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 3430.6886,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 6189.2117,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 6681.0115,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 6593.8171,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
      "ms": 5864.363,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
      "ms": 3357.435,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
      "ms": 1787.2121,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
      "ms": 12188.4806,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
      "ms": 8606.4654,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
      "ms": 743.0582,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
      "ms": 29.761,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
      "ms": 44.203,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
      "ms": 26.1432,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
      "ms": 9.7209,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
      "ms": 496.5767,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
      "ms": 39.6614,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
      "ms": 80.6798,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
      "ms": 78.9368,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
      "ms": 74.0669,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
      "ms": 47.2923,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
      "ms": 42.0322,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
      "ms": 39.7106,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
      "ms": 322.3322,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
      "ms": 113.9666,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
      "ms": 87.5624,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
      "ms": 89.3965,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
      "ms": 33.2208,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
      "ms": 17.2975,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
      "ms": 226.8151,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
      "ms": 130.672,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
      "ms": 87.9192,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
      "ms": 1077.1875,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
      "ms": 244.7105,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
      "ms": 129.9348,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.486,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 9009.0771,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 729.6342,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 209.4425,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 574.3632,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 349.697,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 337.7652,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 822.7487,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 347.1393,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 148.3017,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 58.8692,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 546.3959,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 290.6738,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 226.8482,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 142.8947,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 387.7298,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 84.7448,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 13.4287,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 152.3923,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 176.1284,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1228.153,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 1681.4561,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 2043.2787,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 541.8627,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 1801.6146,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 1129.177,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 787.2199,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 924.9102,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 940.1806,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 267.6764,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 932.8362,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 92.3383,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.1897,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 7837.7202,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 779.1175,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1878.4109,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1012.1825,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1040.1618,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1898.9262,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 603.3966,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 552.9662,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 955.9777,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 568.1287,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.5332,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 1.7483,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1474.8166,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 4629.3527,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 11257.5472,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 76.9888,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 65.1763,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 77.5843,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 198.3307,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 74.4991,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
      "ms": 106.2222,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
      "ms": 802.389,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
      "ms": 52.8276,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "ms": 7687.0402,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "ms": 271.6357,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "ms": 247.4121,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "ms": 1459.0789,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "ms": 426.567,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "ms": 311.3489,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "ms": 262.909,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "ms": 168.1898,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "ms": 151.6663,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "ms": 353.7771,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 5344.1622,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 821.5123,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 923.7032,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 716.0858,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 548.5659,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1180.5706,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 1070.139,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 862.567,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 362.4689,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 425.2229,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 443.1366,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 741.6602,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 589.624,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 614.6772,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 920.4962,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 987.2466,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 746.9004,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 520.3774,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 672.9612,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 459.9542,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 425.0848,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 1078.343,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1356.6045,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 999.4399,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 421.9868,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 679.4354,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 803.7506,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 915.0393,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 386.0021,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 786.3343,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 2391.3833,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1477.2955,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 2478.5081,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1401.656,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 2837.1426,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 1856.9348,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 702.4928,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1432.5041,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 2167.4657,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 535.4491,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 560.8425,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 716.2046,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 383.793,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 526.6961,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1234.9527,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 2605.8886,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1037.8444,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 540.3574,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 2235.2087,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 996.7202,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 3815.2581,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 1930.308,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 378.0332,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 1956.8694,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 24.5637,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 2121.4265,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 2141.7322,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 6564.5724,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2393.3231,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 322.1706,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 175.3426,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 58.8573,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1289.5343,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 397.5961,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 133.5217,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 391.0764,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1078.618,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 324.9684,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 1991.6105,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 971.0396,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 1839.0532,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 6641.7818,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2469.0115,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 332.9501,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 153.4817,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 317.0507,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 44.6996,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1357.7009,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 202.4194,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 247.3955,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 460.5313,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 352.9094,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 1751.0012,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 31.7085,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 201.9037,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 196.7588,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 5493.6595,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1240.8914,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 784.9632,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 297.4975,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
      "ms": 1080.0817,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 5557.5764,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 167.4056,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 388.5162,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 86.3282,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-affected.cjs"
    },
    {
      "file": "codex-review-round38-event-period.integration.cjs",
      "name": "CR38 overtime event must hide the foreign payment period as well as its numbers",
      "ms": 9618.0435,
      "pass": false,
      "error": "The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n",
      "cause": "The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The old request party must not learn the foreign payment period, different from the July work date\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-event-period.integration.cjs:340:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "evidence": "codex-review-round38-results-independent.cjs"
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned lastRun conceals all foreign metadata and preserves the permitted head and stored finance",
      "ms": 5524.8964,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-independent.cjs"
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned top-level runs must exclude a wholly foreign historical membership after transfer",
      "ms": 83.3895,
      "pass": false,
      "error": "A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n",
      "cause": "A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: A former B member now in A must not expose the B branch name through a historical run scopeLabel\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-unassigned.integration.cjs:45:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "evidence": "codex-review-round38-results-independent.cjs"
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned reversal reason conceals the foreign head while the company sees it and real reversal balances",
      "ms": 239.3294,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-independent.cjs"
    },
    {
      "file": "codex-review-round38-related-periods.integration.cjs",
      "name": "CR38 real bonus deduction and loan reversal: foreign references hidden",
      "ms": 6030.5879,
      "pass": false,
      "error": "Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n",
      "cause": "Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-related-periods.integration.cjs:60:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "evidence": "codex-review-round38-results-related.cjs"
    },
    {
      "file": "codex-review-round38-related-periods.integration.cjs",
      "name": "CR38 real bonus deduction and loan reversal: in-scope references preserved",
      "ms": 1508.1087,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round38-results-related.cjs"
    }
  ],
  "diagnostics": [
    {
      "case": "overtime-read-closure",
      "originalRun": 1,
      "paidRun": 2,
      "foreignRead": 403,
      "hidden": [
        null,
        null,
        null,
        null
      ],
      "allowedBeforeTransfer": true,
      "companyAndSelfVisible": true,
      "minutes": 135,
      "hourlyRate": 37.5,
      "multiplier": 1.5,
      "amount": 126.56,
      "timestampsPreserved": true,
      "storedHistoryUnchanged": true
    },
    {
      "case": "overtime-request-event-run-reference",
      "directRunStatus": 403,
      "requestStatus": 200,
      "originalRun": 4,
      "reversalRun": 5,
      "branchReason": "عكس صرف مسير 2026-08 بمسير العكس: عاد السجل معتمدًا بلا مسير",
      "companyReason": "عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير",
      "selfReason": "عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير",
      "amount": 126.56,
      "status": "APPROVED",
      "storedHistoryUnchanged": true
    },
    {
      "case": "overtime-report-run-reference",
      "directRunStatus": 403,
      "reportStatus": 200,
      "branchRun": {
        "id": null,
        "name": "مسير خارج نطاق صلاحيتك",
        "period": null,
        "status": null,
        "startDate": null,
        "endDate": null
      },
      "branchDeferredFromRunId": null,
      "companyRun": {
        "id": 7,
        "name": "مسير قبول مصادر الإضافي 6",
        "period": "2026-08",
        "status": "PAID",
        "startDate": "2026-08-01",
        "endDate": "2026-08-31"
      },
      "companyDeferredFromRunId": 6,
      "amount": 126.56,
      "storedHistoryUnchanged": true
    },
    {
      "case": "scope-raw-row-helper",
      "nestedForeignRefsNull": true,
      "allowedRowsSameObject": true,
      "dateIdentityPreserved": true,
      "moneyPreserved": true,
      "sourceUnchanged": true,
      "companyInternalAndSelfUnchanged": true,
      "kind": "unit with explicit repository fixture"
    },
    {
      "case": "overtime-request-event-run-reference",
      "directRunStatus": 403,
      "requestStatus": 200,
      "originalRun": 2,
      "reversalRun": 3,
      "branchReason": "عكس صرف مسير 2026-08 بمسير العكس: عاد السجل معتمدًا بلا مسير",
      "companyReason": "عكس صرف مسير 2026-08 (#2) بمسير العكس #3: عاد السجل معتمدًا بلا مسير",
      "selfReason": "عكس صرف مسير 2026-08 (#2) بمسير العكس #3: عاد السجل معتمدًا بلا مسير",
      "amount": 126.56,
      "status": "APPROVED",
      "storedHistoryUnchanged": true
    },
    {
      "case": "unassigned-last-run-closure",
      "foreignDirectRead": 403,
      "foreignLastRun": {
        "id": null,
        "name": "مسير خارج نطاق صلاحيتك",
        "period": null,
        "status": null,
        "startDate": null,
        "endDate": null
      },
      "permittedLastRun": {
        "id": 1,
        "name": "CR38 payroll فرع ألف",
        "period": "2026-07",
        "status": "PAID",
        "startDate": "2026-06-23",
        "endDate": "2026-07-22"
      },
      "netEach": 9000,
      "storedFinanceUnchanged": true
    },
    {
      "case": "unassigned-top-level-foreign-run",
      "foreignDirectRead": 403,
      "foreignRun": 2,
      "foreignBranch": "فرع باء المحجوب",
      "branchRuns": [
        {
          "id": 1,
          "name": "CR38 payroll فرع ألف",
          "period": "2026-07",
          "status": "PAID",
          "startDate": "2026-06-23",
          "endDate": "2026-07-22",
          "scopeLabel": "فرع: فرع ألف"
        },
        {
          "id": null,
          "name": "مسير خارج نطاق صلاحيتك",
          "period": "2026-07",
          "status": "PAID",
          "startDate": "2026-06-23",
          "endDate": "2026-07-22",
          "scopeLabel": "فرع: فرع باء المحجوب"
        }
      ],
      "companyRuns": [
        {
          "id": 1,
          "name": "CR38 payroll فرع ألف",
          "period": "2026-07",
          "status": "PAID",
          "startDate": "2026-06-23",
          "endDate": "2026-07-22",
          "scopeLabel": "فرع: فرع ألف",
          "members": 1,
          "excluded": 0
        },
        {
          "id": 2,
          "name": "CR38 payroll فرع باء المحجوب",
          "period": "2026-07",
          "status": "PAID",
          "startDate": "2026-06-23",
          "endDate": "2026-07-22",
          "scopeLabel": "فرع: فرع باء المحجوب",
          "members": 1,
          "excluded": 0
        }
      ],
      "branchSummary": {
        "from": "2026-07-01",
        "to": "2026-07-22",
        "onJob": 2,
        "covered": 2,
        "unassigned": 0,
        "suspended": 0,
        "dataIssues": 0,
        "duplicates": 0
      },
      "storedFinanceUnchanged": true
    },
    {
      "case": "unassigned-reversal-reason-closure",
      "branchReason": {
        "code": "REVERSED_IN_RUN",
        "label": "عُكس صرف بنده في مسير للفترة ولم يُصرف بمسير تكميلي بعد",
        "detail": "نُفّذ عكس صرف بنده؛ اصرفه بمسير تكميلي مربوط بالمسير",
        "run": {
          "id": null,
          "name": "مسير خارج نطاق صلاحيتك",
          "period": null,
          "status": null,
          "startDate": null,
          "endDate": null
        }
      },
      "companyReason": {
        "code": "REVERSED_IN_RUN",
        "label": "عُكس صرف بنده في مسير للفترة ولم يُصرف بمسير تكميلي بعد",
        "detail": "نُفّذ عكس صرف بنده؛ اصرفه بمسير تكميلي مربوط بالمسير",
        "run": {
          "id": 2,
          "name": "CR38 payroll فرع باء المحجوب",
          "period": "2026-07",
          "status": "PAID",
          "startDate": "2026-06-23",
          "endDate": "2026-07-22"
        }
      },
      "originalNet": 9000,
      "reversalNet": -9000,
      "storedFinanceUnchanged": true
    },
    {
      "case": "real-reversal-visibility",
      "foreign": true,
      "direct": [
        403,
        403
      ],
      "net": 8755.44,
      "loanCollected": 300.12,
      "loanRestored": 600.24,
      "storedEvidenceUnchanged": true,
      "checks": [
        {
          "route": "bonuses",
          "actual": [
            null,
            null
          ],
          "expected": [
            null,
            null
          ],
          "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي",
          "companyReason": "عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 123.45 قيدًا مستحقًا (#3) للمسير التكميلي أو التالي"
        },
        {
          "route": "deductions",
          "actual": [
            null,
            null
          ],
          "expected": [
            null,
            null
          ],
          "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي",
          "companyReason": "عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 67.89 قيدًا مستحقًا (#4) للمسير التكميلي أو التالي"
        },
        {
          "route": "loan-RESERVED",
          "actual": [
            null
          ],
          "expected": [
            null
          ],
          "reason": null,
          "companyReason": null
        },
        {
          "route": "loan-PAYROLL_POSTED",
          "actual": [
            null
          ],
          "expected": [
            null
          ],
          "reason": null,
          "companyReason": null
        },
        {
          "route": "loan-REVERSAL",
          "actual": [
            null
          ],
          "expected": [
            null
          ],
          "reason": "عكس صرف مسير 2026-07 بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)",
          "companyReason": "عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)"
        }
      ]
    },
    {
      "case": "real-reversal-visibility",
      "foreign": false,
      "direct": [
        200,
        200
      ],
      "net": 8755.44,
      "loanCollected": 300.12,
      "loanRestored": 600.24,
      "storedEvidenceUnchanged": true,
      "checks": [
        {
          "route": "bonuses",
          "actual": [
            3,
            4
          ],
          "expected": [
            3,
            4
          ],
          "reason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي",
          "companyReason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي"
        },
        {
          "route": "deductions",
          "actual": [
            3,
            4
          ],
          "expected": [
            3,
            4
          ],
          "reason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي",
          "companyReason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي"
        },
        {
          "route": "loan-RESERVED",
          "actual": [
            3
          ],
          "expected": [
            3
          ],
          "reason": null,
          "companyReason": null
        },
        {
          "route": "loan-PAYROLL_POSTED",
          "actual": [
            3
          ],
          "expected": [
            3
          ],
          "reason": null,
          "companyReason": null
        },
        {
          "route": "loan-REVERSAL",
          "actual": [
            4
          ],
          "expected": [
            4
          ],
          "reason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)",
          "companyReason": "عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)"
        }
      ]
    }
  ],
  "databasesCreated": 16,
  "closures": [
    {
      "id": "CR37-B01",
      "numbersClosed": true,
      "remainingPeriodFinding": "CR38-B02",
      "proof": "Unchanged Round37 runtime case passes: hidden #IDs removed, allowed/company/self text and stored history unchanged. New stronger assertion proves a foreign August payment period remains in July overtime request history."
    },
    {
      "id": "CR37-B02",
      "overtimeReportClosed": true,
      "proof": "Actual paid/deferred overtime report hides payment id/name/period/status/start/end and deferred ID, preserves company refs and 126.56. Independent unassigned lastRun and reversal reasons hide foreign metadata and retain own A branch head; top-level runs has separate CR38-B01."
    }
  ],
  "findings": [
    {
      "id": "CR38-B01",
      "severity": "blocking branch isolation",
      "route": "GET /reports/payroll/unassigned",
      "source": "api/src/payroll/payroll-reports.ts:479,559",
      "preExisting": true,
      "proof": "Create, calculate, approve and pay two BRANCH payrolls via real APIs, one employee per branch, 9000 each. Transfer the former B employee to A via employee/calendar API. B-only membership snapshot remains B; A direct payroll GET is 403. July unassigned report includes B run with null id/generic name but scopeLabel naming B, PAID status, 2026-07 period and 2026-06-23..2026-07-22 dates. Company sees both full heads, and A own payroll remains visible. Read operations leave all runs/items/members/events identical.",
      "cause": "Top-level visibleRunIds derives from current-scope employees and all their historical members/items, not snapshot scope. runSummaries invokes runRef without the employee visibility decision, then resolves scopeLabel against all organization names.",
      "expected": "Filter top-level runs by in-scope historical membership (with defined legacy fallback); wholly foreign run absent. Preserve authorized mixed heads and company output; avoid foreign organization labels."
    },
    {
      "id": "CR38-B02",
      "severity": "blocking branch isolation; remaining metadata in event text",
      "routes": [
        "GET /requests/:id",
        "GET /bonuses/:id",
        "GET /deductions/:id",
        "GET /loans/:id/ledger"
      ],
      "source": "api/src/payroll/payroll-run-visibility.ts:34; api/src/requests/requests.service.ts:2086",
      "proof": "Real July overtime deferred to an August B payroll and reversed; after transfer A has request access but August/reversal GET 403. Event text is عكس صرف مسير 2026-08 بمسير العكس: عاد السجل معتمدًا بلا مسير. The hidden payroll period remains although IDs are absent. Real bonus/deduction/loan reversal independently exhibits July period at all three related endpoints. Company/self and in-scope controls retain full authorized text. Stored history unchanged.",
      "cause": "scrubEventReferences strips #digits only; reversal writer embeds parentRun.period as well. Old tests asserted number masking only, not period masking. Current request explicitly requires periods of foreign runs to be hidden.",
      "expected": "Render a generic foreign-run event label from the original refs and visibility decision, removing unauthorized period as well as number/name/status while retaining legitimate monetary effect, work date and stored event. Preserve allowed text verbatim."
    }
  ],
  "staticEvidence": {
    "unassignedMembershipInsertionAndRunSummariesUnchangedFrom733480c": true,
    "sharedScrubberWritersAndRelatedEndpointsUnchangedFrom733480c": true,
    "oldRuntimeExecuted": false
  },
  "financialChecks": {
    "overtime": {
      "rawMinutes": 148,
      "approvedMinutes": 135,
      "hourlyRate": 37.5,
      "multiplier": 1.5,
      "amount": 126.56
    },
    "branchPayrolls": {
      "netEach": 9000,
      "reversal": -9000
    },
    "relatedReversal": {
      "formula": "9000 + 123.45 - 67.89 - 300.12",
      "net": 8755.44,
      "reversal": -8755.44,
      "loanCollected": 300.12,
      "loanRestored": 600.24
    },
    "storedRowsUnchangedByReads": true
  },
  "limitations": {
    "performanceMeasured": false,
    "fullIntegrationSuite": false,
    "fullUnitSuite": false,
    "browser": false,
    "oldRuntime": false,
    "independentDuplicatePayrollFixture": false,
    "productOrOldTestsEdited": false,
    "companyDatabaseWrites": false,
    "servicesStartedOrStopped": false,
    "transport": "In-process Nest/Express with actual guards, validation and service code; no HTTP listener. Existing SEC-07 PDF fixture uses exact private-path dotfiles allowance because supplied worktree is below .claude. No authorization/storage checks bypassed.",
    "migrations": "No new migration. Existing scope and overtime migration tests only on harness-owned disposable databases under prior explicit permission.",
    "boundary": "Latest delta plus related code within 162d50e..e28c17a; main phase0/phase1 work ignored. Prior owner exceptions unchanged. SQL Server 2022 compatibility150; not native SQL2019."
  },
  "staticChecks": {
    "target": "e28c17a8f157d7ede1c6be2b4828506f2cde4813",
    "results": [
      {
        "area": "api",
        "exitCode": 0,
        "diagnostics": ""
      },
      {
        "area": ".",
        "exitCode": 0,
        "diagnostics": ""
      }
    ]
  }
}
