module.exports = {
  "selected": [
    "leave-year-end",
    "leave-contract",
    "employee-suspension",
    "payroll-coverage",
    "payroll-settlement-boundary"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 57,
      "failed": 0,
      "passed": 57,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 57,
      "suites": 0
    },
    "duration_ms": 38092.8434
  },
  "results": [
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 7178.5342,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 81.181,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 157.8388,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 228.5971,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 81.2856,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 6519.1774,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 587.6669,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 54.2198,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 173.8168,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 241.3461,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 97.712,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 161.4868,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 186.4438,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 177.5748,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 34.4207,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 423.3304,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 188.8198,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 218.5642,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 19.8698,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 101.6921,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية أو الجواز بأي صيغة وفريدة، ورقم البصمة فريد",
      "ms": 6967.7543,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو «موقوف» بلا تواريخ مرفوض، وتغيير الجنسية مابيعيدش فحص الهوية",
      "ms": 143.145,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 348.602,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 355.413,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 811.7583,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03: an inactive employee whose CLOSED last working day is the period end keeps the full salary",
      "ms": 6999.0856,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-103: 18 covered days earn 7200; the 1000 installment stays whole and leaves 6200",
      "ms": 749.866,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: joining July 1 earns 5133.33 from a 7000 monthly gross without absence",
      "ms": 475.7889,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: one real absent workday deducts 233.33 from prorated pay and leaves 4900",
      "ms": 536.2962,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: an employee who left before the period and one joining after it have no payable line",
      "ms": 572.284,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: a cancelled offboarding case does not terminate coverage or reduce salary",
      "ms": 508.2562,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: existing lateness/absence before hiring or after the last working day cannot deduct or generate more days",
      "ms": 352.6239,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: the first and last days of the cycle each count as one covered day",
      "ms": 268.5288,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "الشهر 30 يومًا: 18 يومًا مغطى في دورة 31 يومًا تستحق 3600 — التناسب على 30 مثل سعر يوم الخصم",
      "ms": 425.1599,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 31-day cycle pays exactly 6000, with factor one and no extra day",
      "ms": 543.1529,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 28-day cycle pays exactly 6000 without deducting two calendar days",
      "ms": 481.6435,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / الخطوة 14: cycle start 1 uses its calendar month; 29/30/31 start the day after the previous period ends (no shared day)",
      "ms": 6110.0329,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: a SQL save failure preserves the previous run/items/members and leaves no partial new run",
      "ms": 2353.7961,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-01 / PR-02: branch payroll permissions cannot calculate, read, approve, recalculate or pay another branch",
      "ms": 1499.2206,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08: recalculation keeps the stored period dates after the company cycle setting changes",
      "ms": 559.0668,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / PR-11: recalculation cannot change the stored period or scope type and preserves the old snapshot",
      "ms": 514.8924,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: an employee cannot read their calculated draft payslip but can read the same item after approval",
      "ms": 686.0274,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: half-cent proration is cut down (قرار المالك: خانتين بلا تقريب) and the adjusted components equal the earned gross",
      "ms": 243.9862,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: each of the four active payroll states excludes exact overtime/installment claims",
      "ms": 7022.477,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: DRAFT/CANCELLED payroll items do not reserve financial entries",
      "ms": 239.4182,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: malformed historical payroll references reject regeneration and preserve every reviewed line",
      "ms": 221.0802,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a payroll claim created after generation blocks approval without changing reviewed money",
      "ms": 322.3945,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: concurrent approvals settle once, preserve exact references and do not invent payment state",
      "ms": 172.7583,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: changed or deleted linked financial lines require regeneration; manual adjustments remain independent",
      "ms": 344.0136,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: legacy financial settlement without snapshot requires explicit regeneration and keeps permissions",
      "ms": 168.9688,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: payroll after settlement excludes frozen claims and legacy ambiguity is refused",
      "ms": 1047.8481,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: renaming a historical automatic settlement line cannot hide pending financial sources",
      "ms": 83.1648,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: cancelling SETTLED legacy with a renamed automatic line cannot release untracked sources",
      "ms": 88.417,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: all sources claimed by payroll cannot hide ambiguous automatic money behind an empty settlement snapshot",
      "ms": 216.9748,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: historical automatic EOS with no pending financial sources still permits settlement approval",
      "ms": 147.4881,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: simultaneous payroll calculation and settlement approval cannot claim the same sources",
      "ms": 791.4931,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a later offboarding case cannot reclaim sources in an earlier settled snapshot",
      "ms": 207.4426,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup: hr_leave_year_end_test_b467d1b788ceef3d dropped.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_22c87656f60459c3 is absent from sys.databases.",
    "Manual: 12000 × 18 / 30 = 7200; 7200 − 1000 = 6200.",
    "Manual: (6000 + 800 + 200) × 22 / 30 = 5133.33; daily deduction basis remains 7000 / 30.",
    "Manual: 5133.33 − ROUND(7000 / 30, 2) = 4900.00; do not derive day rate from the prorated gross.",
    "قرار المالك (16 سبتمبر): الشهر 30 يومًا في كل شيء — 6000 × 18 / 30 = 3600.",
    "12 explicit cycle-boundary cases checked through POST calculation and persisted GET detail.",
    "Manual half-cent cases (قص بلا تقريب): 30.15 × 3/30 = 3.015 → 3.01؛ (10.15 × 3) × 3/30 = 3.045 → 3.04؛ القروش والإجمالي متطابقين.",
    "Cleanup verified: hr_payroll_coverage_test_41ff9f4e811a501c no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Temporary settlement database removed and absence verified.",
    "tests 57",
    "suites 0",
    "pass 57",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 38092.8434"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_b467d1b788ceef3d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_b467d1b788ceef3d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_41792124a95bc48e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_41792124a95bc48e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_suspension_test_22c87656f60459c3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_suspension_test_22c87656f60459c3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_coverage_test_41ff9f4e811a501c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_coverage_test_41ff9f4e811a501c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_settlement_test_45ad865bcabe5c27\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_settlement_test_45ad865bcabe5c27\"}\n"
  ]
}
