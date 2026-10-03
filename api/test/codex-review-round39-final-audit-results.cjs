module.exports = {
  "checkedAt": "2026-10-03T07:18:27.073Z",
  "target": "f58f894d5b8d00e7e60605001188eb770dc5b289",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 2127,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 25,
  "databases": [
    {
      "name": "hr_chain_disburse_test_0cdd54a337b0ce11",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r38_independent_test_2946f06e071868ea",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r38_ot_test_926eb50b3c9a1c25",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r38_unassigned_test_eec838821b3c3702",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r39_bonus_test_4bd5229cd5e00878",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r39_bonus_test_6112bdbe2d9f60ec",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r39_mixed_test_a5d7d4e4cbe60ee8",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r39_payslip_test_b6b5b41f07a8cfac",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r39_payslip_test_b79906079f6de6bf",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_fulltest_payroll_test_0dff9082688f5417",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_loan_completion_test_83b7ae7116ae62bc",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_b95ff84aa34159d4",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_allowances_test_d8f117e0c6e44ced",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_bonuses_test_ba85f69c6095848b",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_corrections_test_ea9aafd64147da33",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_179e077f35f5b5cd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_history_test_ed963aeef9a7d7ce",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_ot_test_74f96e4285d47031",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_overview_filters_test_2715f49c1b8a6033",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_reports_test_8bdc9ff38d690082",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_typed_deductions_test_b1ee0837df69ce21",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payslip_leaks_test_dcfa8873487f03b6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_reports_test_af6fc3ba1dbc08ad",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_sec1_perm_test_674ad7bb7aa12c56",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_user_branch_scopes_test_4a5f3facc81b82f5",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "secretScan": {
    "files": 24,
    "filesWithMatches": []
  },
  "privateTemporaryDirectoryRemoved": true,
  "preservedSuppliedWorktreesAndDependencies": [
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\api\\node_modules"
  ],
  "evidence": {
    "target": "f58f894d5b8d00e7e60605001188eb770dc5b289",
    "productRange": "e28c17a..f58f894",
    "relatedCodeLimit": "162d50e..f58f894",
    "counts": {
      "tests": 259,
      "passed": 255,
      "failed": 4,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round39-results-previous38.cjs",
        "files": [
          "codex-review-round38-event-period",
          "codex-review-round38-unassigned",
          "codex-review-round38-related-periods"
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
        "file": "codex-review-round39-results-affected.cjs",
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
          "payroll-membership-history"
        ],
        "counts": {
          "tests": 242,
          "failed": 0,
          "passed": 242,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 242,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round39-results-independent.cjs",
        "files": [
          "codex-review-round39-payslip",
          "codex-review-round39-text"
        ],
        "counts": {
          "tests": 8,
          "failed": 5,
          "passed": 3,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 8,
          "suites": 0
        },
        "failures": [
          {
            "file": "codex-review-round39-payslip.integration.cjs",
            "name": "CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact",
            "error": "failed running before hook"
          },
          {
            "file": "codex-review-round39-payslip.integration.cjs",
            "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
            "error": "failed running before hook"
          },
          {
            "file": "codex-review-round39-payslip.integration.cjs",
            "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
            "error": "failed running before hook"
          },
          {
            "file": "codex-review-round39-payslip.integration.cjs",
            "name": "CR39 run-detail: no foreign payroll period through a current in-scope payroll",
            "error": "failed running before hook"
          },
          {
            "file": "codex-review-round39-payslip.integration.cjs",
            "name": "CR39 events: no foreign payroll period through a current in-scope payroll",
            "error": "failed running before hook"
          }
        ]
      },
      {
        "file": "codex-review-round39-results-payslip.cjs",
        "files": [
          "codex-review-round39-payslip"
        ],
        "counts": {
          "tests": 5,
          "failed": 2,
          "passed": 3,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 5,
          "suites": 0
        },
        "failures": [
          {
            "file": "codex-review-round39-payslip.integration.cjs",
            "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
            "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n"
          },
          {
            "file": "codex-review-round39-payslip.integration.cjs",
            "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
            "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n"
          }
        ]
      },
      {
        "file": "codex-review-round39-results-mixed.cjs",
        "files": [
          "codex-review-round39-mixed-report"
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
            "file": "codex-review-round39-mixed-report.integration.cjs",
            "name": "CR39 BRANCH mixed report retains allowed run head without foreign organization names",
            "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n"
          },
          {
            "file": "codex-review-round39-mixed-report.integration.cjs",
            "name": "CR39 DEPARTMENT mixed report retains allowed run head without foreign organization names",
            "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n"
          }
        ]
      },
      {
        "file": "codex-review-round39-results-bonus.cjs",
        "files": [
          "codex-review-round39-bonus-control"
        ],
        "counts": {
          "tests": 1,
          "failed": 1,
          "passed": 0,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 1,
          "suites": 0
        },
        "failures": [
          {
            "file": "codex-review-round39-bonus-control.integration.cjs",
            "name": "CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it",
            "error": "Cannot read properties of undefined (reading 'some')"
          }
        ]
      },
      {
        "file": "codex-review-round39-results-bonus-confirmed.cjs",
        "files": [
          "codex-review-round39-bonus-control"
        ],
        "counts": {
          "tests": 1,
          "failed": 0,
          "passed": 1,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 1,
          "suites": 0
        },
        "failures": []
      }
    ],
    "finalCases": [
      {
        "file": "codex-review-round38-event-period.integration.cjs",
        "name": "CR38 overtime event must hide the foreign payment period as well as its numbers",
        "ms": 11422.6645,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-previous38.cjs"
      },
      {
        "file": "codex-review-round38-unassigned.integration.cjs",
        "name": "CR38 unassigned lastRun conceals all foreign metadata and preserves the permitted head and stored finance",
        "ms": 5850.6349,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-previous38.cjs"
      },
      {
        "file": "codex-review-round38-unassigned.integration.cjs",
        "name": "CR38 unassigned top-level runs must exclude a wholly foreign historical membership after transfer",
        "ms": 72.3311,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-previous38.cjs"
      },
      {
        "file": "codex-review-round38-unassigned.integration.cjs",
        "name": "CR38 unassigned reversal reason conceals the foreign head while the company sees it and real reversal balances",
        "ms": 254.1546,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-previous38.cjs"
      },
      {
        "file": "codex-review-round38-related-periods.integration.cjs",
        "name": "CR38 real bonus deduction and loan reversal: foreign references hidden",
        "ms": 6087.0088,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-previous38.cjs"
      },
      {
        "file": "codex-review-round38-related-periods.integration.cjs",
        "name": "CR38 real bonus deduction and loan reversal: in-scope references preserved",
        "ms": 1322.1626,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-previous38.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
        "ms": 10299.116,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "detailed payroll reports require payroll.view on top of reports.view",
        "ms": 42.9171,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
        "ms": 328.8228,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
        "ms": 138.8685,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
        "ms": 84.7974,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "variance report explains each employee difference by component and isolates unexplained residuals",
        "ms": 50.2309,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
        "ms": 1735.6748,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
        "ms": 302.1804,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-reports.integration.cjs",
        "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
        "ms": 125.9454,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
        "ms": 11676.1559,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
        "ms": 2864.3799,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
        "ms": 4430.5748,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
        "ms": 5408.3928,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
        "ms": 5262.3018,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
        "ms": 5245.2304,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
        "ms": 2573.4208,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
        "ms": 1339.4334,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-corrections.integration.cjs",
        "name": "CR38-B01/B02: موظف اتنقل — قايمة مسيرات «بلا مسير» لقارئ الفرع الجديد زي ما هي (مسيره القديم مايظهرش)، واسم قيده من غير فترة المسير القديم، والشركة بتشوف الكل",
        "ms": 1437.931,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
        "ms": 9343.8627,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
        "ms": 7069.1418,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
        "ms": 658.982,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
        "ms": 28.9181,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
        "ms": 38.9664,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
        "ms": 27.1943,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
        "ms": 10.9623,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
        "ms": 441.3633,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
        "ms": 39.9966,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
        "ms": 70.3127,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
        "ms": 70.3267,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
        "ms": 79.6985,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
        "ms": 44.915,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
        "ms": 39.6703,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
        "ms": 36.9807,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
        "ms": 335.9778,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
        "ms": 89.0994,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
        "ms": 76.4886,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
        "ms": 61.3536,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
        "ms": 31.2127,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
        "ms": 15.2084,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
        "ms": 226.6387,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
        "ms": 97.0959,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
        "ms": 70.5671,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
        "ms": 955.6911,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
        "ms": 215.6162,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
        "ms": 119.406,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-reports.integration.cjs",
        "name": "ZZ — ملخص التغطية والملاحظات",
        "ms": 0.4396,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
        "ms": 7294.8231,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
        "ms": 579.9377,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
        "ms": 163.6818,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
        "ms": 452.4124,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
        "ms": 269.6716,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
        "ms": 266.7907,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
        "ms": 600.5904,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
        "ms": 254.6022,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
        "ms": 102.2062,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
        "ms": 30.5018,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
        "ms": 384.8467,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
        "ms": 196.0571,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
        "ms": 159.3534,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
        "ms": 83.9212,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
        "ms": 238.2076,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
        "ms": 90.2336,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
        "ms": 13.6036,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
        "ms": 134.0339,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
        "ms": 134.8588,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
        "ms": 1142.4991,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
        "ms": 1906.0372,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
        "ms": 2129.5398,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
        "ms": 561.5539,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
        "ms": 1923.7029,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
        "ms": 1177.474,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
        "ms": 929.3129,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
        "ms": 1003.5309,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
        "ms": 1038.9201,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
        "ms": 309.3505,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
        "ms": 1203.6341,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
        "ms": 103.559,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "fulltest-leaves-payroll.integration.cjs",
        "name": "ZZ — ملخص الملاحظات",
        "ms": 0.1822,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
        "ms": 5570.5622,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
        "ms": 632.0038,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
        "ms": 1474.3298,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
        "ms": 752.934,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
        "ms": 775.2947,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
        "ms": 1594.9699,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
        "ms": 487.5968,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
        "ms": 509.6206,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
        "ms": 691.9926,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
        "ms": 387.8541,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
        "ms": 0.485,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
        "ms": 1.4352,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
        "ms": 1072.6471,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "overtime-auto-approve-period.integration.cjs",
        "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
        "ms": 4175.8525,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
        "ms": 11820.9835,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
        "ms": 82.0083,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
        "ms": 66.9056,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
        "ms": 97.7293,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
        "ms": 176.8329,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
        "ms": 71.9979,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
        "ms": 99.0213,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
        "ms": 858.5512,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-response-leaks.integration.cjs",
        "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
        "ms": 55.6201,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
        "ms": 8203.6355,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
        "ms": 366.9488,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
        "ms": 291.9657,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
        "ms": 1847.7765,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
        "ms": 535.1585,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
        "ms": 433.9669,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
        "ms": 255.0887,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
        "ms": 272.7589,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
        "ms": 132.5297,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "user-branch-scopes.integration.cjs",
        "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
        "ms": 166.8991,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
        "ms": 5271.4236,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
        "ms": 839.2633,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
        "ms": 907.3165,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
        "ms": 634.593,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
        "ms": 477.7136,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
        "ms": 1036.8483,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
        "ms": 569.4694,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
        "ms": 568.2109,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
        "ms": 374.8492,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
        "ms": 420.1936,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
        "ms": 466.5099,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
        "ms": 647.3955,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
        "ms": 678.8182,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
        "ms": 696.2409,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
        "ms": 749.1712,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
        "ms": 1096.7211,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
        "ms": 766.3183,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
        "ms": 486.3771,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
        "ms": 629.014,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
        "ms": 473.8098,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
        "ms": 388.6798,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
        "ms": 746.8611,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
        "ms": 1386.1006,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
        "ms": 1019.7416,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
        "ms": 387.4653,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
        "ms": 736.4568,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
        "ms": 850.8604,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
        "ms": 818.5693,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
        "ms": 373.3625,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
        "ms": 774.899,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
        "ms": 2267.959,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
        "ms": 1555.1053,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
        "ms": 2767.7618,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
        "ms": 1376.2852,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
        "ms": 3286.3944,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
        "ms": 2065.8872,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
        "ms": 625.1942,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
        "ms": 1550.8179,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
        "ms": 2745.1691,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
        "ms": 403.5861,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
        "ms": 715.3597,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
        "ms": 985.409,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
        "ms": 469.7248,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
        "ms": 671.4702,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
        "ms": 1437.5125,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
        "ms": 2852.6749,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
        "ms": 1013.4277,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
        "ms": 540.9929,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
        "ms": 2365.0234,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
        "ms": 1055.8571,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
        "ms": 3792.3367,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
        "ms": 1958.7737,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
        "ms": 347.4661,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
        "ms": 1873.2047,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
        "ms": 18.8553,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
        "ms": 2360.2678,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overtime-request.integration.cjs",
        "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
        "ms": 2129.1574,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
        "ms": 6367.9707,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
        "ms": 2290.4698,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
        "ms": 371.4735,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
        "ms": 157.3145,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
        "ms": 60.4809,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
        "ms": 1304.7644,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
        "ms": 455.6614,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
        "ms": 150.0152,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
        "ms": 408.903,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
        "ms": 1105.023,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
        "ms": 325.6079,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
        "ms": 2008.3022,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
        "ms": 891.5243,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-bonuses.integration.cjs",
        "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
        "ms": 1911.2131,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
        "ms": 6788.2031,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
        "ms": 2157.1073,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
        "ms": 358.0182,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
        "ms": 161.5969,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
        "ms": 300.9294,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
        "ms": 40.642,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
        "ms": 1336.1739,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
        "ms": 181.5272,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
        "ms": 239.3632,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
        "ms": 393.6859,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
        "ms": 327.7198,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
        "ms": 1841.4491,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
        "ms": 29.2055,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
        "ms": 246.7713,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-typed-deductions.integration.cjs",
        "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
        "ms": 307.9662,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
        "ms": 5718.3294,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
        "ms": 1216.8511,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
        "ms": 838.6333,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
        "ms": 348.7993,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-overview-filters.integration.cjs",
        "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
        "ms": 1109.0246,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
        "ms": 5639.3572,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
        "ms": 164.9452,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
        "ms": 359.4332,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "security-permission-gaps.integration.cjs",
        "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
        "ms": 89.9201,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
        "ms": 5393.9336,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
        "ms": 322.5971,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
        "ms": 97.4049,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
        "ms": 199.7793,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-15: the employee sees only his own loan ledger",
        "ms": 68.2817,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
        "ms": 46.5833,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
        "ms": 258.1567,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
        "ms": 411.7373,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "loan-completion.integration.cjs",
        "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
        "ms": 119.9652,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
        "ms": 6284.9918,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
        "ms": 2580.9425,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
        "ms": 1322.3775,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
        "ms": 178.1811,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "CR32-B01: مسير فرع تاني للموظف بعد نقله مايظهرش لحساب الفرع في ردود البدل وقايمته، ومسير فرعه بيظهر",
        "ms": 812.2888,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-allowances.integration.cjs",
        "name": "CR33-B01: رفض إلغاء سطر بدل في مسير فرع تاني معتمد أو مصروف من غير رقم المسير لحساب الفرع، وبالرقم للشركة",
        "ms": 831.164,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
        "ms": 8031.4345,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
        "ms": 2772.9957,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
        "ms": 493.7957,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
        "ms": 734.142,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
        "ms": 740.8527,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-financial-exemptions.integration.cjs",
        "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
        "ms": 1169.9033,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
        "ms": 6675.6546,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
        "ms": 155.3638,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
        "ms": 3884.5028,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
        "ms": 4559.8472,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
        "ms": 899.2539,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
        "ms": 915.1122,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
        "ms": 476.8553,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
        "ms": 638.3474,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
        "ms": 462.1039,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-approval-chain-disbursement.integration.cjs",
        "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
        "ms": 178.5015,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked",
        "ms": 5958.5723,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
        "ms": 616.7516,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
        "ms": 169.6207,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged",
        "ms": 918.553,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "payroll-membership-history.integration.cjs",
        "name": "PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local",
        "ms": 618.3074,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-affected.cjs"
      },
      {
        "file": "codex-review-round39-payslip.integration.cjs",
        "name": "CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact",
        "ms": 6686.0486,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-payslip.cjs"
      },
      {
        "file": "codex-review-round39-payslip.integration.cjs",
        "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
        "ms": 63.1153,
        "pass": false,
        "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
        "cause": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
        "stack": "AssertionError [ERR_ASSERTION]: The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.lines.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.lines.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:49:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
        "evidence": "codex-review-round39-results-payslip.cjs"
      },
      {
        "file": "codex-review-round39-payslip.integration.cjs",
        "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
        "ms": 53.9493,
        "pass": false,
        "error": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
        "cause": "The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n",
        "stack": "AssertionError [ERR_ASSERTION]: The current payroll is visible; an embedded reference to the old foreign payroll is not\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:49:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
        "evidence": "codex-review-round39-results-payslip.cjs"
      },
      {
        "file": "codex-review-round39-payslip.integration.cjs",
        "name": "CR39 run-detail: no foreign payroll period through a current in-scope payroll",
        "ms": 63.5391,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-payslip.cjs"
      },
      {
        "file": "codex-review-round39-payslip.integration.cjs",
        "name": "CR39 events: no foreign payroll period through a current in-scope payroll",
        "ms": 39.4124,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-payslip.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
        "ms": 0.606,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-independent.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
        "ms": 0.1929,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-independent.cjs"
      },
      {
        "file": "payroll-run-period-scrub.test.cjs",
        "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
        "ms": 0.6291,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-independent.cjs"
      },
      {
        "file": "codex-review-round39-mixed-report.integration.cjs",
        "name": "CR39 BRANCH mixed report retains allowed run head without foreign organization names",
        "ms": 6578.6279,
        "pass": false,
        "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
        "cause": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
        "stack": "AssertionError [ERR_ASSERTION]: Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-mixed-report.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
        "evidence": "codex-review-round39-results-mixed.cjs"
      },
      {
        "file": "codex-review-round39-mixed-report.integration.cjs",
        "name": "CR39 DEPARTMENT mixed report retains allowed run head without foreign organization names",
        "ms": 3496.3004,
        "pass": false,
        "error": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
        "cause": "Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n",
        "stack": "AssertionError [ERR_ASSERTION]: Permitting a mixed run head does not permit disclosing private organization names from its foreign branches\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-mixed-report.integration.cjs:33:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
        "evidence": "codex-review-round39-results-mixed.cjs"
      },
      {
        "file": "codex-review-round39-bonus-control.integration.cjs",
        "name": "CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it",
        "ms": 19452.9236,
        "pass": true,
        "skip": false,
        "evidence": "codex-review-round39-results-bonus-confirmed.cjs"
      }
    ],
    "diagnostics": [
      {
        "case": "overtime-request-event-run-reference",
        "directRunStatus": 403,
        "requestStatus": 200,
        "originalRun": 2,
        "reversalRun": 3,
        "branchReason": "عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: عاد السجل معتمدًا بلا مسير",
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
            "reason": "عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي",
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
            "reason": "عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي",
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
            "reason": "عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)",
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
      },
      {
        "case": "real-restored-ledger-controls",
        "foreignRunRead": 403,
        "currentRunRead": 200,
        "ledgerLabel": "إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance",
        "obligationDetailLabel": "إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance",
        "companyLabel": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance",
        "net": 9067.89,
        "restoredAmount": 67.89,
        "companyAndSelfPreserved": true,
        "storedUnchanged": true
      },
      {
        "case": "in-scope-payroll-foreign-text",
        "route": "payslip",
        "originalForeignPeriod": "2026-07",
        "currentVisiblePeriod": "2026-11",
        "directForeignRead": 403,
        "routeStatus": 200,
        "leaks": [
          {
            "path": "$.lines.earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.lines.earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          }
        ],
        "companyRefs": [
          {
            "path": "$.obligationDetails[0].label",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.lines.earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.lines.earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          }
        ],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "in-scope-payroll-foreign-text",
        "route": "run-lines",
        "originalForeignPeriod": "2026-07",
        "currentVisiblePeriod": "2026-11",
        "directForeignRead": 403,
        "routeStatus": 200,
        "leaks": [
          {
            "path": "$.columns.earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.columns.earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.rows[0].earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.rows[0].earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          }
        ],
        "companyRefs": [
          {
            "path": "$.columns.earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.columns.earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.rows[0].earnings[1].key",
            "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          },
          {
            "path": "$.rows[0].earnings[1].name",
            "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
          }
        ],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "in-scope-payroll-foreign-text",
        "route": "run-detail",
        "originalForeignPeriod": "2026-07",
        "currentVisiblePeriod": "2026-11",
        "directForeignRead": 403,
        "routeStatus": 200,
        "leaks": [],
        "companyRefs": [],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "in-scope-payroll-foreign-text",
        "route": "events",
        "originalForeignPeriod": "2026-07",
        "currentVisiblePeriod": "2026-11",
        "directForeignRead": 403,
        "routeStatus": 200,
        "leaks": [],
        "companyRefs": [],
        "net": 9067.89,
        "storedUnchanged": true
      },
      {
        "case": "mixed-head-foreign-organization-label",
        "kind": "BRANCH",
        "fullRunRead": 403,
        "mixedHeadAllowed": true,
        "hiddenName": "فرع باء المحجوب",
        "listHead": {
          "id": null,
          "name": "مسير خارج نطاق صلاحيتك",
          "period": "2026-07",
          "status": "PAID",
          "startDate": "2026-06-23",
          "endDate": "2026-07-22",
          "scopeLabel": "فرع: فرع ألف، فرع باء المحجوب"
        },
        "summaryScopeLabel": "فرع: فرع ألف، فرع باء المحجوب",
        "storedNet": 18000,
        "storedUnchanged": true
      },
      {
        "case": "mixed-head-foreign-organization-label",
        "kind": "DEPARTMENT",
        "fullRunRead": 403,
        "mixedHeadAllowed": true,
        "hiddenName": "CR39 confidential department B",
        "listHead": {
          "id": null,
          "name": "مسير خارج نطاق صلاحيتك",
          "period": "2026-08",
          "status": "PAID",
          "startDate": "2026-07-23",
          "endDate": "2026-08-22",
          "scopeLabel": "قسم: CR39 visible department A، CR39 confidential department B"
        },
        "summaryScopeLabel": "قسم: CR39 visible department A، CR39 confidential department B",
        "storedNet": 36000,
        "storedUnchanged": true
      },
      {
        "case": "bonus-payout-period-control",
        "directForeignRead": 403,
        "hiddenStatus": "مصروف",
        "hiddenPayout": {
          "state": "PAID",
          "label": "مصروف",
          "runId": null,
          "period": null
        },
        "companyPayout": {
          "state": "PAID",
          "label": "مصروف",
          "runId": 1,
          "period": "2026-07"
        },
        "selfPayout": {
          "state": "PAID",
          "label": "مصروف",
          "runId": 1,
          "period": "2026-07"
        },
        "amount": 123.45,
        "net": 9123.45,
        "storedUnchanged": true
      }
    ],
    "databasesCreated": 25,
    "comparisons": [
      {
        "file": "api/src/payroll/payroll-reports.ts",
        "name": "payrollRunScopeLabel",
        "unchangedFromE28c17a": true
      },
      {
        "file": "api/src/payroll/payroll-reports.ts",
        "name": "payrollRunsReport",
        "unchangedFromE28c17a": true
      },
      {
        "file": "api/src/payroll/payroll.service.ts",
        "name": "runLines",
        "unchangedFromE28c17a": true
      },
      {
        "file": "api/src/payroll/payroll-item-lines.ts",
        "name": "creditLine",
        "unchangedFromE28c17a": true
      }
    ],
    "closures": [
      {
        "id": "CR38-B01",
        "closed": true,
        "proof": "All six unchanged Round38 cases pass. Wholly foreign historical payroll absent from unassigned runs; allowed local and company heads unchanged. Independent mixed-head test exposes separate organization-label disclosure CR39-B02."
      },
      {
        "id": "CR38-B02",
        "previousEventPathsClosed": true,
        "proof": "Real overtime, bonus, deduction and loan reversal event periods hidden after transfer, allowed/company/self text preserved. Ledger labels and payslip obligationDetails also sanitized; actual paid bonus status/payout.period/appliedPeriod hidden, self/company/in-scope reader preserved. Remaining payslip/run-lines copies are CR39-B01."
      }
    ],
    "findings": [
      {
        "id": "CR39-B01",
        "severity": "blocking branch isolation",
        "routes": [
          "GET /payroll/items/:id",
          "GET /payroll/runs/:id/lines"
        ],
        "sources": [
          "api/src/payroll/payroll-run-visibility.ts:156",
          "api/src/payroll/payroll.service.ts:1952",
          "api/src/payroll/payroll.service.ts:1957",
          "api/src/payroll/payroll-item-lines.ts:136"
        ],
        "reproduction": "Real API credit/allowance 67.89 for B employee earning 9000. July payroll paid (9067.89), genuinely reversed (-9067.89), automatically regenerated obligation label references July. Actual employee transfer to A, November payroll calculated/approved/paid (9067.89), A membership snapshot verified. A cannot read July/reversal (403), can read November (200). Ledger and obligationDetails hide July, but payslip lines.earnings[].name AND .key, and run-lines rows plus columns, retain مسير 2026-07. No injected label or stored snapshot mutation.",
        "cause": "Deep scrub only recognizes label/reason/note/notes/description; line text uses name and also embeds text in key. runLines does not apply visibility-aware text rendering at all.",
        "expected": "Scope all line names and keys, including columns, preserving their consistent mapping and totals. Keep company/self/allowed text and stored rows intact.",
        "preExisting": "The unmasked source names/keys and runLines are unchanged; this delta attempted payslip sanitization but misses the actual line fields."
      },
      {
        "id": "CR39-B02",
        "severity": "blocking foreign organization-name disclosure",
        "routes": [
          "GET /reports/payroll/unassigned",
          "GET /reports/payroll"
        ],
        "sources": [
          "api/src/payroll/payroll-reports.ts:152",
          "api/src/payroll/payroll-reports.ts:255",
          "api/src/payroll/payroll-reports.ts:561"
        ],
        "reproduction": "Real BRANCH mixed A+B payroll (2 x 9000 = 18000), and DEPARTMENT mixed A+B payroll (4 x 9000 = 36000), calculated/approved/paid. A full run GET 403 but legitimately receives mixed report head. scopeLabel names branch B and confidential department B in both report endpoints. Company retains full labels and stored items unchanged.",
        "cause": "payrollRunScopeLabel resolves every definition ID from global organization-name maps without reader scope. Correct new visibleRunIds membership test does not sanitize the surviving mixed head.",
        "expected": "Retain the permitted mixed head, but scope its organization labels or render a generic mixed-scope description. Company labels stay complete.",
        "preExisting": true,
        "policyInterpretation": "User exception permits a mixed run head, not names of arbitrary departments/branches outside the viewer scope. No finding assigned to the legitimate mixed run identity/status or local amounts."
      }
    ],
    "controls": {
      "overtime": 126.56,
      "bonusDeductionLoanNet": 8755.44,
      "restoredAllowance": {
        "base": 9000,
        "allowance": 67.89,
        "net": 9067.89,
        "reversal": -9067.89,
        "currentNet": 9067.89
      },
      "paidBonus": {
        "amount": 123.45,
        "net": 9123.45
      },
      "storedFinanceAndHistoryUnchangedByReads": true,
      "rawCurrentRunAndEventPeriodScanPassed": true
    },
    "fixtureCorrections": {
      "superseded": [
        "independent: five payslip before-hook failures caused by my attempting a correctly forbidden direct debit; replaced with legitimate CREDIT allowance via API",
        "bonus: /bonuses/mine intentionally lacks obligations collection; corrected only my assertion, then reran successfully"
      ],
      "resultsRetained": true,
      "databaseCleanupIncludesAllAttempts": true
    },
    "limitations": {
      "fullIntegrationSuite": false,
      "fullUnitSuite": false,
      "pureTextUnitTests": 3,
      "browser": false,
      "oldRevisionRuntime": false,
      "performanceMeasured": false,
      "newMigrations": false,
      "environment": "Actual Nest guards/pipes/controllers/services, in-process HTTP transport without listening service. SQL2022 compatibility150, not native SQL2019. Existing migration fixtures only on private random databases under prior permission.",
      "transport": "Exact private SEC-07 PDF test path permits dot directory segments under supplied .claude worktree; actual authorization and storage checks intact.",
      "scope": "Reviewed full product delta and related paths only within authorized range. Main phase0/phase1 untouched. Prior owner exceptions unchanged.",
      "modifications": "New round39 tests/evidence and requested report only; no product/old tests/company data/service changes."
    },
    "staticChecks": {
      "target": "f58f894d5b8d00e7e60605001188eb770dc5b289",
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
