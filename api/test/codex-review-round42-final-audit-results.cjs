module.exports = {
  "checkedAt": "2026-10-03T09:00:58.351Z",
  "target": "ce15142c2fef34386a8332b518237038fd598e62",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 2193,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 30,
  "databases": [
    {
      "name": "hr_chain_disburse_test_854e840b73ee54d6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r40_payslip_test_0b498b1dc68288dc",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r40_scopes_test_b03601c6a538fb2e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r41_payslip_test_e9e30501bba34bcf",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r42_mixed_test_61ee3d3851faaf80",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r42_mixed_test_81a6cf184faabdf7",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r42_mixed_test_f604729257806e04",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_cost_center_test_484e6379c06a85de",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_financial_report_test_4388f9e693af0c50",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_fulltest_payroll_test_c1f5b07be0fe124b",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_loan_completion_test_060402bd8e42baa1",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_93b053be6bbfb6a1",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_allowances_test_319a9fe2f5486369",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_bonuses_test_93d4a22bbace9314",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_corrections_test_d6869a13430f1dcd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_48cd0c85162af614",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_history_test_96935dbc42d4e4ef",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_ot_test_71ccf4d873510af5",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_overview_filters_test_8893650abbcd2f27",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_reports_test_d38cf23704b2426a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_typed_deductions_test_9fea4a2957fc4c79",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payslip_leaks_test_006392f0390d1aa2",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_profile_test_1bb4da9cd86c0d9f",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_profile_test_3f49da98f32fac47",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_recovery_test_0a485b86ff6ab0e6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_recovery_test_3c5b62d9be2a18c8",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_reports_test_00cf2cb104be5f4d",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_sec1_perm_test_88b0a8021c82fded",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_settings_test_5b6862a733f038c6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_user_branch_scopes_test_34c9ac29a48b779a",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "secretScan": {
    "files": 21,
    "filesWithMatches": []
  },
  "privateTemporaryDirectoryRemoved": true,
  "fixtureOutputsRemoved": [
    "hr-settings-findings-1791017761750.txt"
  ],
  "preservedSuppliedWorktreesAndDependencies": [
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\api\\node_modules"
  ],
  "evidence": {
    "target": "ce15142c2fef34386a8332b518237038fd598e62",
    "productRange": "2cb8883..ce15142",
    "relatedCodeLimit": "162d50e..ce15142",
    "verdict": "APPROVE",
    "counts": {
      "tests": 371,
      "passed": 371,
      "failed": 0,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round42-results-previous41.cjs",
        "files": [
          "codex-review-round41-independent",
          "codex-review-round41-text",
          "codex-review-round40-key-boundary",
          "codex-review-round40-scope-controls"
        ],
        "counts": {
          "tests": 18,
          "failed": 0,
          "passed": 18,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 18,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round42-results-mixed.cjs",
        "files": [
          "codex-review-round42-mixed"
        ],
        "counts": {
          "tests": 2,
          "failed": 2,
          "passed": 0,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 2,
          "suites": 0
        },
        "failures": [
          {
            "file": "codex-review-round42-mixed.integration.cjs",
            "name": "CR42 mixed reader: each employee keeps only authorized historical text and stable row-column keys across four line readers",
            "error": "failed running before hook",
            "cause": "PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}"
          },
          {
            "file": "codex-review-round42-mixed.integration.cjs",
            "name": "CR42 query variants and client-supplied nested text do not become an employee payroll context",
            "error": "failed running before hook",
            "cause": "PATCH /employees/2: 400 {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}"
          }
        ]
      },
      {
        "file": "codex-review-round42-results-mixed-confirmed.cjs",
        "files": [
          "codex-review-round42-mixed"
        ],
        "counts": {
          "tests": 2,
          "failed": 0,
          "passed": 2,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 2,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round42-results-affected.cjs",
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
          "security-permission-gaps",
          "loan-completion",
          "payroll-allowances",
          "payroll-financial-exemptions",
          "payroll-approval-chain-disbursement",
          "payroll-membership-history",
          "financial-report",
          "cost-center-report",
          "request-execution",
          "leave-contract",
          "fulltest-settings",
          "profile-self-service"
        ],
        "counts": {
          "tests": 351,
          "failed": 1,
          "passed": 350,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 351,
          "suites": 0
        },
        "failures": [
          {
            "file": "profile-self-service.integration.cjs",
            "name": "PD-05: the self photo endpoint — own employee only, image only, uploaded by the caller; the owner and in-scope HR see it",
            "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
            "cause": "Expected values to be strictly equal:\n\n404 !== 200\n"
          }
        ]
      },
      {
        "file": "codex-review-round42-results-profile-confirmed.cjs",
        "files": [
          "profile-self-service"
        ],
        "counts": {
          "tests": 6,
          "failed": 0,
          "passed": 6,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 6,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round42-results-mixed-final.cjs",
        "files": [
          "codex-review-round42-mixed"
        ],
        "counts": {
          "tests": 2,
          "failed": 0,
          "passed": 2,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 2,
          "suites": 0
        },
        "failures": []
      }
    ],
    "finalCases": [
      {
        "file": "codex-review-round41-independent.integration.cjs",
        "name": "CR41 closures: seven real readers, opaque stable keys, permitted self/company text, exact money and stored history",
        "ms": 8458.2863,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round41-independent.integration.cjs",
        "name": "CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip",
        "ms": 2301.6547,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
        "ms": 0.6038,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
        "ms": 0.1416,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
        "ms": 0.493,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة",
        "ms": 0.7544,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR40-B01: بصمة المفتاح المحجوب معتمة — مش hash علني للنص الأصلي، فتجربة الشهور من الرد بس مابتطابقش أي شهر",
        "ms": 2.4091,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR40: قايمة فترات بعد «مسير» — كل فترة مخفية بتتشال والمرئية تفضل",
        "ms": 0.1319,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR40/CR41 (شبكة الأمان): موظفي الرد من الرد نفسه بس، وكل نص بفترات موظفه هو (مش اتحاد الرد) — والأرقام والتواريخ زي ما هي",
        "ms": 10.7825,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد",
        "ms": 80.2332,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-key-boundary.integration.cjs",
        "name": "CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history",
        "ms": 6140.6992,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-key-boundary.integration.cjs",
        "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
        "ms": 52.5399,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-key-boundary.integration.cjs",
        "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
        "ms": 25.0117,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-key-boundary.integration.cjs",
        "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
        "ms": 50.8627,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-key-boundary.integration.cjs",
        "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
        "ms": 54.9835,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-scope-controls.integration.cjs",
        "name": "CR40 TEAM: scoped labels, multi-branch/company control, counts and legacy branch header",
        "ms": 5779.5327,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-scope-controls.integration.cjs",
        "name": "CR40 CUSTOM: scoped labels, multi-branch/company control, counts and legacy branch header",
        "ms": 1695.2649,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round40-scope-controls.integration.cjs",
        "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
        "ms": 1535.2714,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-previous41.cjs"
      },
      {
        "file": "codex-review-round42-mixed.integration.cjs",
        "name": "CR42 mixed reader: each employee keeps only authorized historical text and stable row-column keys across four line readers",
        "ms": 7053.5934,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-mixed-final.cjs"
      },
      {
        "file": "codex-review-round42-mixed.integration.cjs",
        "name": "CR42 query variants and client-supplied nested text do not become an employee payroll context",
        "ms": 108.6776,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-mixed-final.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
        "ms": 11736.6616,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "detailed payroll reports require payroll.view on top of reports.view",
        "ms": 33.9108,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
        "ms": 439.1483,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
        "ms": 116.4084,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
        "ms": 93.2607,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "variance report explains each employee difference by component and isolates unexplained residuals",
        "ms": 62.2161,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
        "ms": 1858.1166,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
        "ms": 297.3113,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
        "ms": 164.1734,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
        "ms": 13677.3386,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
        "ms": 3552.7659,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
        "ms": 5433.2322,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
        "ms": 5866.6437,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
        "ms": 5431.8098,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
        "ms": 5382.2307,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
        "ms": 4471.8614,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
        "ms": 1580.1017,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR38-B01/B02: موظف اتنقل — قايمة مسيرات «بلا مسير» لقارئ الفرع الجديد زي ما هي (مسيره القديم مايظهرش)، واسم قيده من غير فترة المسير القديم، والشركة بتشوف الكل",
        "ms": 1485.3841,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR40-B01/B02: موظف اتعكس صرفه واتنقل — بنود مسيره الجديد في كل شاشة (القسيمة، جدول المسير، سطور الشهر، مراجعة الاعتماد، شاشة المسير، السجل المالي) من غير فترة مسيره القديم لقارئ الفرع الجديد، وبصمة المفتاح مابتتفكّش، والشركة وصاحب القسيمة بيشوفوا النص كامل",
        "ms": 3226.5508,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR41: كل موظف بفترات مسيراته هو — مسير مختلط اتعكس لموظفين، واحد منهم اتنقل: نص زميله المرئي بيفضل كامل لقارئ الفرع، ورقم موظف في رابط القسيمة مابيغيرش ردها",
        "ms": 5386.6054,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
        "ms": 10142.2894,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
        "ms": 8447.0564,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
        "ms": 911.6217,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
        "ms": 33.6458,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
        "ms": 50.3528,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
        "ms": 31.9767,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
        "ms": 10.6447,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
        "ms": 480.6046,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
        "ms": 48.4003,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
        "ms": 82.49,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
        "ms": 79.5523,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
        "ms": 74.5251,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
        "ms": 48.4782,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
        "ms": 40.7883,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
        "ms": 57.9502,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
        "ms": 367.1181,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
        "ms": 154.7125,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
        "ms": 168.7323,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
        "ms": 102.1682,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
        "ms": 49.1072,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
        "ms": 29.4859,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
        "ms": 276.3201,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
        "ms": 159.4177,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
        "ms": 131.7749,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
        "ms": 1270.7351,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
        "ms": 346.8533,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
        "ms": 123.5131,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "ZZ — ملخص التغطية والملاحظات",
        "ms": 0.6218,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
        "ms": 11689.5753,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
        "ms": 690.4225,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
        "ms": 191.5415,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
        "ms": 636.2045,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
        "ms": 366.0471,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
        "ms": 339.9463,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
        "ms": 791.4869,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
        "ms": 341.3143,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
        "ms": 168.3003,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
        "ms": 47.2837,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
        "ms": 578.7436,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
        "ms": 244.5322,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
        "ms": 215.3049,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
        "ms": 120.6294,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
        "ms": 364.4889,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
        "ms": 141.3895,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
        "ms": 16.1332,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
        "ms": 156.5318,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
        "ms": 172.1085,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
        "ms": 1427.5803,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
        "ms": 1748.4017,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
        "ms": 1984.9782,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
        "ms": 551.0922,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
        "ms": 2214.642,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
        "ms": 1325.3193,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
        "ms": 920.8779,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
        "ms": 1043.3899,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
        "ms": 1450.68,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
        "ms": 377.2245,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
        "ms": 1035.8408,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
        "ms": 104.1707,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "ZZ — ملخص الملاحظات",
        "ms": 0.1794,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
        "ms": 7711.596,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
        "ms": 990.7119,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
        "ms": 2479.0439,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
        "ms": 1877.8599,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
        "ms": 1418.029,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
        "ms": 2751.5829,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
        "ms": 1097.5278,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
        "ms": 838.9215,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
        "ms": 1048.3529,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
        "ms": 585.8816,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
        "ms": 0.5039,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
        "ms": 1.7391,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
        "ms": 1704.225,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
        "ms": 4858.7858,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
        "ms": 14370.3463,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
        "ms": 121.4266,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
        "ms": 93.9986,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
        "ms": 123.831,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
        "ms": 262.1893,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
        "ms": 88.9698,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
        "ms": 114.4395,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
        "ms": 1034.7457,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
        "ms": 73.7623,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
        "ms": 10261.9301,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
        "ms": 315.2368,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
        "ms": 335.3113,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
        "ms": 1882.9168,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
        "ms": 538.7421,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
        "ms": 447.6419,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
        "ms": 329.8472,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
        "ms": 203.0783,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
        "ms": 124.3122,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
        "ms": 218.0251,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
        "ms": 6676.5529,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
        "ms": 941.0216,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
        "ms": 1019.6285,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
        "ms": 827.7012,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
        "ms": 975.2638,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
        "ms": 1914.512,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
        "ms": 652.1908,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
        "ms": 843.3875,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
        "ms": 482.733,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
        "ms": 1064.4482,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
        "ms": 840.8955,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
        "ms": 872.0579,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
        "ms": 650.5673,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
        "ms": 477.1758,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
        "ms": 827.7183,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
        "ms": 1271.1595,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
        "ms": 913.3942,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
        "ms": 756.106,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
        "ms": 691.9623,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
        "ms": 580.8541,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
        "ms": 561.3994,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
        "ms": 904.8516,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
        "ms": 1788.0347,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
        "ms": 1685.7961,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
        "ms": 668.737,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
        "ms": 1021.5065,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
        "ms": 1247.778,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
        "ms": 1117.1485,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
        "ms": 612.0137,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
        "ms": 1080.4823,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
        "ms": 2279.7036,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
        "ms": 1792.275,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
        "ms": 2901.2657,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
        "ms": 1709.9562,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
        "ms": 3331.1193,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
        "ms": 3284.3797,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
        "ms": 736.8135,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
        "ms": 1448.2544,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
        "ms": 2469.4487,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
        "ms": 368.8771,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
        "ms": 650.0658,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
        "ms": 940.259,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
        "ms": 453.1021,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
        "ms": 677.1612,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
        "ms": 1396.1974,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
        "ms": 2942.7288,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
        "ms": 1341.4699,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
        "ms": 720.6685,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
        "ms": 2944.8003,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
        "ms": 1220.9735,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
        "ms": 4296.9105,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
        "ms": 2215.8029,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
        "ms": 424.5969,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
        "ms": 2390.0943,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
        "ms": 27.8468,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
        "ms": 2744.272,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
        "ms": 2814.3875,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
        "ms": 7512.232,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
        "ms": 2955.9863,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
        "ms": 428.5642,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
        "ms": 238.0546,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
        "ms": 107.7739,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
        "ms": 1507.989,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
        "ms": 475.0807,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
        "ms": 162.5069,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
        "ms": 498.0617,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
        "ms": 1189.7072,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
        "ms": 363.4833,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
        "ms": 2227.4335,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
        "ms": 1117.5244,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
        "ms": 2165.0747,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
        "ms": 7951.6522,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
        "ms": 2647.0987,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
        "ms": 394.1677,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
        "ms": 171.0359,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
        "ms": 367.6876,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
        "ms": 52.5425,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
        "ms": 1646.6836,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
        "ms": 201.5259,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
        "ms": 330.1535,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
        "ms": 456.9299,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
        "ms": 458.2464,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
        "ms": 2131.6371,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
        "ms": 37.335,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
        "ms": 283.4056,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
        "ms": 282.8015,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
        "ms": 5499.2433,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
        "ms": 1319.552,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
        "ms": 814.5285,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
        "ms": 317.1242,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
        "ms": 1084.2726,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
        "ms": 5698.4606,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
        "ms": 198.5521,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
        "ms": 518.4969,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
        "ms": 184.9033,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
        "ms": 8226.8309,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
        "ms": 446.0665,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
        "ms": 151.264,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
        "ms": 336.7309,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-15: the employee sees only his own loan ledger",
        "ms": 69.6586,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
        "ms": 70.0171,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
        "ms": 362.1024,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
        "ms": 484.8379,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
        "ms": 195.4793,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
        "ms": 5305.6065,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
        "ms": 2205.7072,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
        "ms": 1236.6343,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
        "ms": 157.788,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "CR32-B01: مسير فرع تاني للموظف بعد نقله مايظهرش لحساب الفرع في ردود البدل وقايمته، ومسير فرعه بيظهر",
        "ms": 831.4041,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "CR33-B01: رفض إلغاء سطر بدل في مسير فرع تاني معتمد أو مصروف من غير رقم المسير لحساب الفرع، وبالرقم للشركة",
        "ms": 807.0715,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
        "ms": 7307.3915,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
        "ms": 2776.2799,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
        "ms": 532.2059,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
        "ms": 735.4943,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
        "ms": 773.1856,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
        "ms": 1093.7257,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
        "ms": 7393.7714,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
        "ms": 190.3911,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
        "ms": 4049.5975,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
        "ms": 5131.7566,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
        "ms": 950.5915,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
        "ms": 921.0186,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
        "ms": 1061.2742,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
        "ms": 994.7031,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
        "ms": 694.8533,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
        "ms": 193.5585,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked",
        "ms": 6112.5133,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
        "ms": 580.9568,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
        "ms": 153.5441,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged",
        "ms": 746.8635,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local",
        "ms": 639.1233,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "financial-report.integration.cjs",
        "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
        "ms": 5218.9992,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "financial-report.integration.cjs",
        "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
        "ms": 38.3704,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "financial-report.integration.cjs",
        "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
        "ms": 53.3967,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "financial-report.integration.cjs",
        "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
        "ms": 31.7002,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "cost-center-report.integration.cjs",
        "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
        "ms": 5177.1934,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "cost-center-report.integration.cjs",
        "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
        "ms": 14.5154,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "cost-center-report.integration.cjs",
        "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
        "ms": 47.3122,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
        "ms": 5419.2867,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "future title changes wait for their effective date and scheduled execution is idempotent",
        "ms": 125.1883,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
        "ms": 165.0003,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
        "ms": 78.8098,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
        "ms": 819.1877,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
        "ms": 146.0713,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "a failure after both shift writes rolls back overrides and audit rows together",
        "ms": 64.2243,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
        "ms": 226.0114,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
        "ms": 155.7473,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
        "ms": 166.9606,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "new handlers reject incompatible request codes instead of silently completing",
        "ms": 0.5049,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
        "ms": 123.6687,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
        "ms": 44.2501,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
        "ms": 138.0818,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
        "ms": 108.1126,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
        "ms": 47.8124,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "custody transfer enforces the officer branch and request owner before any write",
        "ms": 209.571,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "forged attachment references are also rejected when saving drafts",
        "ms": 41.1539,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
        "ms": 152.4612,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "concurrent cancellation of the same leave restores its balance only once",
        "ms": 80.8046,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
        "ms": 95.2563,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
        "ms": 1283.8955,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
        "ms": 204.9991,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
        "ms": 211.2777,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
        "ms": 476.5217,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
        "ms": 62.8628,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
        "ms": 107.8574,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
        "ms": 66.541,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
        "ms": 157.5376,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
        "ms": 252.1176,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
        "ms": 284.6248,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
        "ms": 86.2825,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
        "ms": 62.5073,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
        "ms": 249.7252,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
        "ms": 79.0954,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
        "ms": 151.3344,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
        "ms": 75.7497,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
        "ms": 163.764,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
        "ms": 106.7253,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
        "ms": 112.3428,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
        "ms": 5967.6314,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
        "ms": 592.2307,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
        "ms": 51.0692,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
        "ms": 196.4896,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
        "ms": 265.7027,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
        "ms": 126.4101,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
        "ms": 196.115,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
        "ms": 232.9376,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
        "ms": 212.4683,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
        "ms": 34.2565,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
        "ms": 441.5137,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
        "ms": 181.1073,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
        "ms": 261.3479,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
        "ms": 27.1539,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "leave-contract.integration.cjs",
        "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
        "ms": 137.8731,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "A1 — كتالوج مفاتيح الإعدادات كامل ومقروء (GET /settings/config)",
        "ms": 7735.8558,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "A2 — مفتاح غير مُعلن مرفوض ولا يُخزَّن (لا إنشاء مفاتيح من العميل)",
        "ms": 15.8986,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "A3 — سلطة الكتابة: نطاق الشركة فقط، والموظف العادي ممنوع",
        "ms": 67.4685,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "A4 — مفاتيح يقرؤها الخادم ولا تُضبط من الإعدادات (مفاتيح يتيمة)",
        "ms": 73.8227,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "B1 — attendance.grace_minutes: السماحية تغيّر التأخير المحسوب",
        "ms": 1147.092,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "B2 — attendance.weekend_days: أيام الراحة تغيّر أيام العمل المحسوبة",
        "ms": 163.8345,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "B3 — attendance.device_key: المفتاح يفتح/يقفل استقبال البصمات",
        "ms": 119.3227,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "B4 — attendance.holiday_work_multiplier: مضاعف بدل دوام العطلة الافتراضي",
        "ms": 126.1458,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "B5 — attendance.flex.*: إعدادات المرونة تُثبَّت في نسخة تعريف الدوام الجديدة",
        "ms": 145.8541,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "B6 — attendance.absence_penalty_days / sync_interval_minutes / absence_catchup_max_days",
        "ms": 43.8979,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "C1 — overtime.detection_threshold_hours / rounding_minutes: البصمة تُنتج دقائق مختلفة",
        "ms": 391.5725,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "C2 — overtime.multiplier_* : مضاعف نوع اليوم يغيّر قيمة الإضافي",
        "ms": 261.1504,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "C3 — overtime.enabled / allow_early_overtime / request_backdate_days / max_hours_*",
        "ms": 346.5986,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "C3b — مفاتيح «إعداد» مقفولة على قيمة واحدة منفّذة (توثيق لا إعداد)",
        "ms": 5.292,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "C4 — overtime.wage_components: مفتاح توافق — أي قيمة تُعاد لقائمة المكونات الكاملة",
        "ms": 18.867,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "D1 — leave.annual_entitled: استحقاق الموظف الجديد يتبع الإعداد",
        "ms": 364.9959,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "D2 — leave.sick_entitled: هل المفتاح مقروء فعلاً؟ (مفتاح ميت مشتبه فيه)",
        "ms": 118.8053,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "D3 — leave.max_backdate_days: حد الأثر الرجعي لطلب الإجازة",
        "ms": 177.129,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "D4 — leave.accrual_mode / probation_months / carryover_*",
        "ms": 95.1936,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "D5 — أنواع الإجازات: إنشاء وتعديل، والقاعدة تتحكم في الطلب",
        "ms": 88.538,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "E1 — payroll.cycle_start_day: يوم بداية الدورة يغيّر مدى فترة المسير",
        "ms": 43.9075,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "E2 — payroll.monthly_days / daily_hours / late_deduction_enabled / salary_evidence_mode",
        "ms": 75.8762,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "E3 — payroll.shortfall_* و attendance_overlap_policy و attendance_daily_cap_days",
        "ms": 138.3965,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "E4 — payroll.policy.*: افتراضات النسخة الجديدة متحقَّق منها ومتصلة",
        "ms": 161.0863,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "E5 — system.currency و onboarding.window_days و eos.*",
        "ms": 200.3734,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "F1 — loan.request_open / request_from_day / request_to_day: فتح وقفل طلب السلفة",
        "ms": 183.206,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "F2 — loan.exceptional_reason_min_length / first_installment_max_months_ahead / insufficient_net_behavior",
        "ms": 52.6926,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "G1 — deductions.*: أقل طول للسبب وحد الدفعة وإنشاء المدير",
        "ms": 228.6793,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "G2 — bonuses.* و financial_exemptions.*",
        "ms": 304.3699,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "H1 — company.*: صيغ ملف الشركة وأثرها على المستندات",
        "ms": 390.8508,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I1 — الفروع: إنشاء وتعديل، وأيام الراحة على مستوى الفرع تغيّر أيام العمل",
        "ms": 279.2522,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I2 — الأقسام والفرق: الهيكل وعزل الفروع",
        "ms": 129.6236,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I3 — الكتالوجات (مسميات/درجات/مراكز تكلفة/أنواع أصول/أنواع إذن): إنشاء وتعديل وسلطة",
        "ms": 401.6291,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I4 — الورديات وجداول العمل: القاعدة تغيّر التأخير وأيام العمل",
        "ms": 348.96,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I5 — قواعد استثناء أيام العمل: القاعدة تغيّر يوم الراحة إلى دوام",
        "ms": 196.9157,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I6 — العطلات الرسمية: العطلة تغيّر أيام العمل، وحساب الفرع ممنوع",
        "ms": 210.9361,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I7 — المستخدمون والأدوار: الصلاحية الممنوحة تفتح السلوك فعلاً",
        "ms": 262.3852,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I8 — سلاسل الاعتماد وأنواع الطلبات: التعريف يتحكم في مسار الطلب",
        "ms": 162.5768,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "fulltest-settings.integration.cjs",
        "name": "I9 — أنواع الخصم والمكافأة (كتالوج): إنشاء وتعديل وسلطة",
        "ms": 48.4576,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-affected.cjs"
      },
      {
        "file": "profile-self-service.integration.cjs",
        "name": "PD-01: the request applies nothing until the final approval, then writes only the changed fields with one change-log row each",
        "ms": 5317.8998,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-profile-confirmed.cjs"
      },
      {
        "file": "profile-self-service.integration.cjs",
        "name": "PD-02: invalid values are refused at submission with an Arabic message and leave no request; a request invalid at approval applies nothing",
        "ms": 639.5561,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-profile-confirmed.cjs"
      },
      {
        "file": "profile-self-service.integration.cjs",
        "name": "PD-03: national ID and passport stay unique — checked at the final approval only (no oracle for the employee), and under two simultaneous approvals",
        "ms": 507.382,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-profile-confirmed.cjs"
      },
      {
        "file": "profile-self-service.integration.cjs",
        "name": "PD-03b: the final approval of an identity change waits on the same identity lock as the HR edit (hr:employees:identity)",
        "ms": 125.5419,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-profile-confirmed.cjs"
      },
      {
        "file": "profile-self-service.integration.cjs",
        "name": "PD-04: bank, salary, org, codes, dates and the work email are refused — even when configured as a field of the type",
        "ms": 133.1379,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-profile-confirmed.cjs"
      },
      {
        "file": "profile-self-service.integration.cjs",
        "name": "PD-05: the self photo endpoint — own employee only, image only, uploaded by the caller; the owner and in-scope HR see it",
        "ms": 305.8334,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round42-results-profile-confirmed.cjs"
      }
    ],
    "diagnostics": [
      {
        "case": "CR41-seven-reader-closures",
        "routes": [
          "payslip",
          "lines",
          "run",
          "overview",
          "review",
          "ledger",
          "register"
        ],
        "status": 200,
        "oldForeignRunStatus": 403,
        "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~ce261d34931c7560",
        "publicCandidates": 432,
        "algorithms": 4,
        "matches": [],
        "net": 9067.89,
        "reversal": -9067.89,
        "companySelfPreserved": true,
        "storedUnchanged": true
      },
      {
        "case": "CR41-query-payroll-month-oracle",
        "actorHasPayrollView": false,
        "ownPayslipStatus": 200,
        "foreignItemStatus": 404,
        "observations": [
          {
            "target": "nonexistent",
            "retainsOwnJuly": true,
            "identical": true
          },
          {
            "target": "foreignNoPayroll",
            "retainsOwnJuly": true,
            "identical": true
          },
          {
            "target": "foreignAugust",
            "retainsOwnJuly": true,
            "identical": true
          },
          {
            "target": "self",
            "retainsOwnJuly": true,
            "identical": true
          },
          {
            "target": "foreignJuly",
            "retainsOwnJuly": true,
            "identical": true
          }
        ],
        "ownLineBefore": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance",
        "ownLineAfter": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance",
        "net": 9067.89,
        "companyUnchanged": true,
        "storedUnchanged": true
      },
      {
        "case": "line-key-rendering-controls",
        "hiddenKeys": [
          "BASIC",
          "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~26f101862a4d1a75"
        ],
        "rowColumnMapping": true,
        "stableReads": true,
        "net": 9067.89,
        "companySelfPreserved": true,
        "storedUnchanged": true
      },
      {
        "case": "recover-hidden-period-from-key",
        "route": "payslip",
        "directForeignRead": 403,
        "currentRead": 200,
        "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~26f101862a4d1a75",
        "readerOnlyCandidateSpace": 432,
        "decoded": [],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "recover-hidden-period-from-key",
        "route": "run-lines",
        "directForeignRead": 403,
        "currentRead": 200,
        "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~26f101862a4d1a75",
        "readerOnlyCandidateSpace": 432,
        "decoded": [],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "adjacent-reader-foreign-period",
        "route": "overview-lines",
        "url": "/payroll/overview/lines?period=2026-11",
        "foreignRead": 403,
        "currentRead": 200,
        "leaks": [],
        "companyRefs": [
          {
            "path": "$.columns.earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
          },
          {
            "path": "$.columns.earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
          },
          {
            "path": "$.rows[0].earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
          },
          {
            "path": "$.rows[0].earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
          }
        ],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "adjacent-reader-foreign-period",
        "route": "approval-review",
        "url": "/payroll/approval-chain/runs/3/review",
        "foreignRead": 403,
        "currentRead": 200,
        "leaks": [],
        "companyRefs": [
          {
            "path": "$.rows[0].earningLines[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
          },
          {
            "path": "$.rows[0].earningLines[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
          }
        ],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "extended-scope-label-controls",
        "kind": "TEAM",
        "branchLabel": "فريق: CR40 allowed team، وغيرها خارج نطاق صلاحيتك",
        "companyLabel": "فريق: CR40 allowed team، CR40 private team",
        "multiLabel": "فريق: CR40 allowed team، CR40 private team",
        "localTotal": "6000.00",
        "companyTotal": "15000.00",
        "branchHeader": [
          null,
          null
        ],
        "companyHeader": [
          null,
          null
        ],
        "storedUnchanged": true
      },
      {
        "case": "extended-scope-label-controls",
        "kind": "CUSTOM",
        "branchLabel": "قائمة مخصّصة",
        "companyLabel": "قائمة مخصّصة (2 موظف)",
        "multiLabel": "قائمة مخصّصة",
        "localTotal": "6000.00",
        "companyTotal": "15000.00",
        "branchHeader": [
          null,
          null
        ],
        "companyHeader": [
          2,
          "فرع باء المحجوب"
        ],
        "storedUnchanged": true
      },
      {
        "case": "extended-scope-label-controls",
        "kind": "COST_CENTER",
        "branchLabel": "مركز تكلفة: CR40 company cost center",
        "companyLabel": "مركز تكلفة: CR40 company cost center",
        "multiLabel": "مركز تكلفة: CR40 company cost center",
        "localTotal": "6000.00",
        "companyTotal": "15000.00",
        "branchHeader": [
          null,
          null
        ],
        "companyHeader": [
          null,
          null
        ],
        "storedUnchanged": true
      },
      {
        "case": "CR42-mixed-real-cycle",
        "oldRunRead": 403,
        "newRunRead": 200,
        "observations": [
          {
            "employee": 1,
            "hidden": false,
            "name": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR42 allowance R25-1",
            "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR42 allowance R25-1",
            "net": 6011.11
          },
          {
            "employee": 2,
            "hidden": true,
            "name": "إعادة قيد #2 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR42 allowance R25-2",
            "key": "ALLOWANCE:إعادة قيد #2 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR42 allowance R25-2~8507c7ca85b96ae2",
            "net": 9022.22
          }
        ],
        "net": 15033.33,
        "reversal": -15033.33,
        "companyAndOwnerFullText": true,
        "storedUnchanged": true
      },
      {
        "case": "CR42-context-controls",
        "queryVariants": 5,
        "identicalSelfResponses": true,
        "untrustedSerializedPayloadNotParsed": true,
        "storedUnchanged": true
      },
      {
        "case": "CR42-mixed-real-cycle",
        "oldRunRead": 403,
        "newRunRead": 200,
        "observations": [
          {
            "employee": 1,
            "hidden": false,
            "name": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR42 allowance R25-1",
            "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR42 allowance R25-1",
            "net": 6011.11
          },
          {
            "employee": 2,
            "hidden": true,
            "name": "إعادة قيد #2 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR42 allowance R25-2",
            "key": "ALLOWANCE:إعادة قيد #2 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR42 allowance R25-2~43ee54088f67713d",
            "net": 9022.22
          }
        ],
        "net": 15033.33,
        "reversal": -15033.33,
        "companyAndOwnerFullText": true,
        "storedUnchanged": true
      },
      {
        "case": "CR42-context-controls",
        "queryVariants": 5,
        "identicalSelfResponses": true,
        "untrustedSerializedPayloadNotParsed": true,
        "storedUnchanged": true
      }
    ],
    "databasesCreated": 30,
    "closures": [
      {
        "id": "CR41-B01",
        "closed": true,
        "proof": "The prior live oracle test passes unchanged at this revision. Ordinary self-service account without payroll.view gets identical own-payslip JSON with no query, own ID, nonexistent ID, foreign employee with no payroll, foreign August payroll and foreign July payroll. Direct foreign item still returns 404. Five further query forms, including duplicate employeeId and employee[id], also leave the own-payslip body unchanged.",
        "implementationRead": "The interceptor now reads only authenticated user from the request. Employee contexts come from response employeeId or employee.id, and nearest employee context replaces inherited context. describePayrollItemsLines and run breakdown scrub per employee, not by a union. Full four-file product delta read."
      }
    ],
    "findings": [],
    "controls": {
      "mixedRealCycle": {
        "originalPeriod": "2026-07",
        "currentPeriod": "2026-11",
        "base": [
          6000,
          9000
        ],
        "restoredCredits": [
          11.11,
          22.22
        ],
        "currentNet": [
          6011.11,
          9022.22
        ],
        "total": 15033.33,
        "reversal": -15033.33,
        "lifecycle": "Real allowance creation, calculate, approve, pay, reversal and actual employee transfer through the API, followed by another calculate/approve/pay. Synthetic employee and attendance exemption setup only.",
        "perEmployeeText": "Same old July run, one employee originally in A and one in B. Reader A sees July text for A employee and redacted text for transferred B employee within the same current response. Verified on payslips, run lines, monthly lines, approval review and financial register. Original mixed run access 403; fully in-scope current run 200.",
        "keys": "Payslip, table, monthly lines and approval review line objects match per employee; columns contain exactly one matching key/name. Company and self retain original text.",
        "immutableReads": "Full stored run/item/obligation/event snapshots are deep-equal before and after reads and query variants."
      },
      "priorSevenReaders": true,
      "priorHmacPublicDictionaryNoMatch": true,
      "priorScopeLabelControls": true,
      "serializedUntrustedPayload": "Pure walker control only: client-authored JSON stored as a string is not parsed as employee context. This is not presented as a separate HTTP exploit test."
    },
    "fixtureCorrections": [
      {
        "execution": "mixed",
        "cause": "My initial transfer fixture sent departmentId:null and correctly received 400. Supplied a real in-scope department in the new round42 test, then both tests passed. No product assertion had run in the failed attempt."
      },
      {
        "execution": "affected",
        "case": "PD-05 self photo download",
        "cause": "Express ignores dot-directory paths in the supplied .claude worktree. Restricted test transport adaptation to private hr-profile-files-*/YYYY-MM/<uuid>.png alongside existing SEC07 PDF fixture. All six unchanged profile tests then passed, including foreign HR and peer 403s. Authorization and storage checks unchanged."
      }
    ],
    "limitations": {
      "fullIntegrationSuite": false,
      "fullUnitSuite": false,
      "textUnitTests": 8,
      "browser": false,
      "oldRevisionRuntime": false,
      "performanceMeasured": false,
      "newMigrations": false,
      "environment": "Real Nest guards/pipes/controllers/interceptors/services in-process without a listening HTTP service. SQL Server2022 compatibility150, not native SQL2019. Existing migration fixtures only on our disposable databases under prior explicit permission.",
      "reviewed": "Full four-file product delta plus related readers and response shapes inside authorized range. Inspected request payload serialization and financial report aggregation; no additional reproduced disclosure found. This is not an exhaustive audit of every route.",
      "fixtures": "Prior round40 legacy-header controls and product explicitly seeded debit/breakdown text remain documented fixtures. New mixed scenario uses actual product-produced restored-credit text.",
      "scope": "Main phase0/phase1/phase2 untouched. Owner decisions not reclassified. No product/old-test edits, company-data writes, service changes, or performance measurements."
    },
    "staticChecks": {
      "target": "ce15142c2fef34386a8332b518237038fd598e62",
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
  },
  "performanceMeasured": false
}
