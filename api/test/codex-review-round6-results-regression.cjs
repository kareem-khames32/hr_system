module.exports = {
  "selected": [
    "codex-review-round5-boundaries",
    "leave-contract",
    "codex-review-round6-settings"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 60,
      "failed": 0,
      "passed": 60,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 60,
      "suites": 0
    },
    "duration_ms": 37710.2835
  },
  "results": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B01 canonicalization covers mixed case, trailing spaces and every later validator branch",
      "ms": 5081.189,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B02 and N02 transferred request detail preserves parties and masks all current organization fields",
      "ms": 414.5874,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N01 history matrix covers global, multi-branch, legacy, deleted and forbidden definitions",
      "ms": 480.0518,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 report uses inclusive start and end, ignores cancelled/pre-rehire cases and preserves real presence",
      "ms": 317.7093,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 archive near local midnight must retain the same final day as employmentWindowOf",
      "ms": 34.6726,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 246.8824,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 6541.1068,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 497.9235,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 41.4411,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 155.3614,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 215.1109,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 106.277,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 193.3966,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 145.2411,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 156.5551,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 42.7656,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 371.7943,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 180.595,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 199.6553,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 18.8519,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 100.7749,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "A1 — كتالوج مفاتيح الإعدادات كامل ومقروء (GET /settings/config)",
      "ms": 7146.5757,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "A2 — مفتاح غير مُعلن مرفوض ولا يُخزَّن (لا إنشاء مفاتيح من العميل)",
      "ms": 13.9424,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "A3 — سلطة الكتابة: نطاق الشركة فقط، والموظف العادي ممنوع",
      "ms": 53.8749,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "A4 — مفاتيح يقرؤها الخادم ولا تُضبط من الإعدادات (مفاتيح يتيمة)",
      "ms": 70.5273,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "B1 — attendance.grace_minutes: السماحية تغيّر التأخير المحسوب",
      "ms": 1290.7984,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "B2 — attendance.weekend_days: أيام الراحة تغيّر أيام العمل المحسوبة",
      "ms": 186.0786,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "B3 — attendance.device_key: المفتاح يفتح/يقفل استقبال البصمات",
      "ms": 132.8336,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "B4 — attendance.holiday_work_multiplier: مضاعف بدل دوام العطلة الافتراضي",
      "ms": 129.0562,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "B5 — attendance.flex.*: إعدادات المرونة تُثبَّت في نسخة تعريف الدوام الجديدة",
      "ms": 196.4728,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "B6 — attendance.absence_penalty_days / sync_interval_minutes / absence_catchup_max_days",
      "ms": 55.6145,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "C1 — overtime.detection_threshold_hours / rounding_minutes: البصمة تُنتج دقائق مختلفة",
      "ms": 481.8925,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "C2 — overtime.multiplier_* : مضاعف نوع اليوم يغيّر قيمة الإضافي",
      "ms": 358.7381,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "C3 — overtime.enabled / allow_early_overtime / request_backdate_days / max_hours_*",
      "ms": 487.4887,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "C3b — مفاتيح «إعداد» مقفولة على قيمة واحدة منفّذة (توثيق لا إعداد)",
      "ms": 6.0504,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "C4 — overtime.wage_components: مفتاح توافق — أي قيمة تُعاد لقائمة المكونات الكاملة",
      "ms": 23.7925,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "D1 — leave.annual_entitled: استحقاق الموظف الجديد يتبع الإعداد",
      "ms": 311.8918,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "D2 — leave.sick_entitled: هل المفتاح مقروء فعلاً؟ (مفتاح ميت مشتبه فيه)",
      "ms": 127.5605,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "D3 — leave.max_backdate_days: حد الأثر الرجعي لطلب الإجازة",
      "ms": 182.8592,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "D4 — leave.accrual_mode / probation_months / carryover_*",
      "ms": 122.6744,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "D5 — أنواع الإجازات: إنشاء وتعديل، والقاعدة تتحكم في الطلب",
      "ms": 117.0966,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "E1 — payroll.cycle_start_day: يوم بداية الدورة يغيّر مدى فترة المسير",
      "ms": 48.776,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "E2 — payroll.monthly_days / daily_hours / late_deduction_enabled / salary_evidence_mode",
      "ms": 82.7461,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "E3 — payroll.shortfall_* و attendance_overlap_policy و attendance_daily_cap_days",
      "ms": 90.0766,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "E4 — payroll.policy.*: افتراضات النسخة الجديدة متحقَّق منها ومتصلة",
      "ms": 133.5101,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "E5 — system.currency و onboarding.window_days و eos.*",
      "ms": 213.2531,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "F1 — loan.request_open / request_from_day / request_to_day: فتح وقفل طلب السلفة",
      "ms": 209.217,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "F2 — loan.exceptional_reason_min_length / first_installment_max_months_ahead / insufficient_net_behavior",
      "ms": 68.8459,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "G1 — deductions.*: أقل طول للسبب وحد الدفعة وإنشاء المدير",
      "ms": 190.3816,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "G2 — bonuses.* و financial_exemptions.*",
      "ms": 175.2981,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "H1 — company.*: صيغ ملف الشركة وأثرها على المستندات",
      "ms": 148.7722,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I1 — الفروع: إنشاء وتعديل، وأيام الراحة على مستوى الفرع تغيّر أيام العمل",
      "ms": 159.646,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I2 — الأقسام والفرق: الهيكل وعزل الفروع",
      "ms": 57.4865,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I3 — الكتالوجات (مسميات/درجات/مراكز تكلفة/أنواع أصول/أنواع إذن): إنشاء وتعديل وسلطة",
      "ms": 304.0493,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I4 — الورديات وجداول العمل: القاعدة تغيّر التأخير وأيام العمل",
      "ms": 342.013,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I5 — قواعد استثناء أيام العمل: القاعدة تغيّر يوم الراحة إلى دوام",
      "ms": 162.2433,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I6 — العطلات الرسمية: العطلة تغيّر أيام العمل، وحساب الفرع ممنوع",
      "ms": 263.4308,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I7 — المستخدمون والأدوار: الصلاحية الممنوحة تفتح السلوك فعلاً",
      "ms": 223.884,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I8 — سلاسل الاعتماد وأنواع الطلبات: التعريف يتحكم في مسار الطلب",
      "ms": 198.5282,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-settings.integration.cjs",
      "name": "I9 — أنواع الخصم والمكافأة (كتالوج): إنشاء وتعديل وسلطة",
      "ms": 55.553,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"licenceAliases\":5,\"categoryAliases\":5,\"validatorRejections\":16,\"authorisedLicenceWorks\":true,\"ordinaryCanonicalWrite\":true,\"scopeWriteDenied\":3}",
    "{\"hiddenActors\":5,\"visibleActors\":3,\"insideUnprivileged\":403,\"foreignEqualsMissing\":true,\"foreignPartyAccess\":4,\"confidentialMasked\":true}",
    "{\"historyMatrix\":[{\"kind\":\"SHIFT\",\"expected\":[200,200,200,404],\"actual\":[200,200,200,404]},{\"kind\":\"SHIFT\",\"expected\":[200,200,404,404],\"actual\":[200,200,404,404]},{\"kind\":\"SHIFT\",\"expected\":[200,200,200,200],\"actual\":[200,200,200,200]},{\"kind\":\"SHIFT\",\"expected\":[403,403,403,403],\"actual\":[403,403,403,403]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,200,404],\"actual\":[200,200,200,404]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,404,404],\"actual\":[200,200,404,404]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,200,200],\"actual\":[200,200,200,200]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[403,403,403,403],\"actual\":[403,403,403,403]}],\"deletedCompanyOnly\":true}",
    "{\"employmentReportCases\":[{\"label\":\"actual-start\",\"expectedAbsent\":9,\"actualAbsent\":9,\"presencePreserved\":1},{\"label\":\"open-case\",\"expectedAbsent\":6,\"actualAbsent\":6,\"presencePreserved\":1},{\"label\":\"cancel-prehire-archive\",\"expectedAbsent\":6,\"actualAbsent\":6,\"presencePreserved\":1},{\"label\":\"case-wins-over-archive\",\"expectedAbsent\":9,\"actualAbsent\":9,\"presencePreserved\":1},{\"label\":\"earliest-case\",\"expectedAbsent\":6,\"actualAbsent\":6,\"presencePreserved\":1},{\"label\":\"ended-unknown\",\"expectedAbsent\":11,\"actualAbsent\":11,\"presencePreserved\":1}]}",
    "{\"probe\":\"archive-midnight\",\"zone\":\"Africa/Cairo\",\"instant\":\"2026-09-10T22:30:00.000Z\",\"employmentLastDay\":\"2026-09-11\",\"windowApi\":\"2026-09-11\",\"sqlDate\":\"2026-09-11\",\"expectedAbsent\":1,\"actualAbsent\":1}",
    "{\"probe\":\"inbox-after-transfer\",\"baseline\":false,\"employeeStatus\":404,\"detailHidden\":true,\"detailTitle\":null,\"oldTitle\":\"OLD JOB R5\",\"newTitle\":\"NEW FOREIGN JOB R5\",\"transferViaApi\":true}",
    "scenarios=39 checks=360 passed=360 failed=0",
    "Cleanup verified: hr_settings_test_ddc6f2170d0b311f is absent from sys.databases.",
    "tests 60",
    "suites 0",
    "pass 60",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 37710.2835"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5boundaries_test_3e2ff3fa418f901c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5boundaries_test_3e2ff3fa418f901c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5boundaries_test_3e2ff3fa418f901c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_4e38725e48bf4993\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_4e38725e48bf4993\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settings_test_ddc6f2170d0b311f\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "\n===== FINDINGS =====\n===== COVERAGE =====\nCOVERED   overtime.enabled [behaviour,read,write]\nCOVERED   overtime.biometric_requires_confirmation [dead,read,validate,write]\nCOVERED   overtime.detection_threshold_hours [behaviour,read,validate,write]\nCOVERED   overtime.rounding_minutes [behaviour,read,validate,write]\nCOVERED   overtime.rounding_direction [dead,read,validate,write]\nCOVERED   overtime.request_backdate_days [read,validate,write]\nCOVERED   overtime.max_closed_periods [read,write]\nCOVERED   overtime.max_hours_per_day [behaviour,read,validate,write]\nCOVERED   overtime.max_hours_per_week [read,write]\nCOVERED   overtime.max_hours_per_month [read,write]\nCOVERED   overtime.allow_early_overtime [read,write]\nCOVERED   overtime.missing_punch_policy [dead,read,validate,write]\nCOVERED   overtime.leave_conflict_policy [dead,read,validate,write]\nCOVERED   overtime.wage_components [behaviour,read,write]\nCOVERED   overtime.multiplier_weekday [behaviour,read,validate,write]\nCOVERED   overtime.multiplier_weekend [behaviour,read,write]\nCOVERED   overtime.multiplier_holiday [behaviour,read,write]\nCOVERED   attendance.holiday_work_multiplier [behaviour,read,write]\nCOVERED   attendance.grace_minutes [behaviour,read,validate,write]\nCOVERED   attendance.flex.count_early_work_toward_required [behaviour,read,write]\nCOVERED   attendance.flex.prorate_window_on_partial_leave [read,snapshot]\nCOVERED   attendance.flex.shortfall_grace_minutes [behaviour,read,write]\nCOVERED   attendance.flex.unpaid_break_minutes [behaviour,read,validate,write]\nCOVERED   attendance.flex.max_session_minutes [read,snapshot,write]\nCOVERED   attendance.flex.window_supersedes_grace [read,snapshot]\nCOVERED   attendance.flex.missing_checkout_policy [dead,read,snapshot,write]\nCOVERED   payroll.shortfall_enabled [read,write]\nCOVERED   payroll.daily_accrual_enabled [dead,read,write]\nCOVERED   payroll.daily_accrual_hour [dead,read,write]\nCOVERED   payroll.shortfall_mode [read,validate,write]\nCOVERED   payroll.shortfall_value [read,validate,write]\nCOVERED   payroll.attendance_overlap_policy [read,validate,write]\nCOVERED   payroll.attendance_daily_cap_days [read,validate,write]\nCOVERED   attendance.absence_penalty_days [read,validate,write]\nCOVERED   attendance.weekend_days [behaviour,read,validate,write]\nCOVERED   attendance.sync_interval_minutes [read,write]\nCOVERED   attendance.absence_catchup_max_days [read,validate,write]\nCOVERED   attendance.device_key [behaviour,read,validate,write]\nCOVERED   leave.annual_entitled [authority,behaviour,read,validate,write]\nCOVERED   leave.sick_entitled [behaviour,read,write]\nCOVERED   leave.max_backdate_days [behaviour,read,write]\nCOVERED   leave.accrual_mode [read,validate,write]\nCOVERED   leave.probation_months [behaviour,read,write]\nCOVERED   leave.carryover_max_days [read,write]\nCOVERED   leave.carryover_expiry_months [read,write]\nCOVERED   onboarding.window_days [behaviour,read,write]\nCOVERED   system.currency [read,validate,write]\nCOVERED   system.country [dead,read,write]\nCOVERED   company.name [read,validate,write]\nCOVERED   company.name_en [read,write]\nCOVERED   company.commercial_register [read,write]\nCOVERED   company.address [read,write]\nCOVERED   company.phone [read,write]\nCOVERED   company.logo_file_id [read,write]\nCOVERED   company.commercial_register_expiry [read,validate,write]\nCOVERED   company.vat_number [read,validate,write]\nCOVERED   company.unified_number [read,validate,write]\nCOVERED   company.gosi_establishment_number [read,write]\nCOVERED   company.eg_insurance_establishment_number [read,write]\nCOVERED   company.qiwa_establishment_number [read,write]\nCOVERED   company.national_address_building_no [read,write]\nCOVERED   company.national_address_street [read,write]\nCOVERED   company.national_address_district [read,write]\nCOVERED   company.national_address_city [read,write]\nCOVERED   company.national_address_postal_code [read,validate,write]\nCOVERED   company.national_address_additional_no [read,write]\nCOVERED   company.email [read,validate,write]\nCOVERED   company.website [read,validate,write]\nCOVERED   company.payroll_bank_name [read,write]\nCOVERED   company.payroll_iban [read,validate,write]\nCOVERED   company.wps_establishment_id [read,write]\nCOVERED   eos.months_per_year [read,validate,write]\nCOVERED   eos.tier1_years [read,write]\nCOVERED   eos.months_per_year_after [read,write]\nCOVERED   eos.resignation_factors [read,validate,write]\nCOVERED   eos.reason_factors [read,validate,write]\nCOVERED   payroll.cycle_start_day [behaviour,read,validate,write]\nCOVERED   payroll.monthly_days [dead,read,validate,write]\nCOVERED   payroll.daily_hours [read,validate,write]\nCOVERED   payroll.late_deduction_enabled [read,validate,write]\nCOVERED   payroll.salary_evidence_mode [read,validate,write]\nCOVERED   loan.insufficient_net_behavior [read,validate,write]\nCOVERED   loan.exceptional_reason_min_length [behaviour,read,validate,write]\nCOVERED   loan.first_installment_max_months_ahead [read,validate,write]\nCOVERED   loan.request_from_day [behaviour,read,validate,write]\nCOVERED   loan.request_to_day [behaviour,read,write]\nCOVERED   loan.request_open [behaviour,read,validate,write]\nCOVERED   payroll.policy.default_period_type [read,write]\nCOVERED   payroll.policy.cycle_end_mode [read,write]\nCOVERED   payroll.policy.cycle_end_day [read,validate,write]\nCOVERED   payroll.policy.base_days_basis [read,write]\nCOVERED   payroll.policy.rate_base [read,write]\nCOVERED   payroll.policy.rounding_mode [read,validate,write]\nCOVERED   payroll.policy.rounding_scale [read,validate,write]\nCOVERED   payroll.policy.division_by_zero_mode [read,write]\nCOVERED   payroll.policy.max_deduction_pct_of_gross [read,write]\nCOVERED   payroll.policy.min_net_guarantee [read,validate,write]\nCOVERED   payroll.policy.net_floor_pct [behaviour,read,write]\nCOVERED   payroll.policy.carry_over_excess [read,write]\nCOVERED   payroll.policy.skip_attendance [read,write]\nCOVERED   payroll.early_leave_deduction_enabled [read,write]\nCOVERED   payroll.hourly_rate_basis [dead,read,validate,write]\nCOVERED   payroll.day_rate_basis [dead,read,validate,write]\nCOVERED   payroll.loan_catchup_max_overdue [read,validate,write]\nCOVERED   overtime.default_window [dead,read,validate,write]\nCOVERED   overtime.outside_window_policy [dead,read,validate,write]\nCOVERED   payroll.approval_self_approval_allowed [authority,read,write]\nCOVERED   payroll.exempt_overtime_eligible [read,validate,write]\nCOVERED   payroll.exempt_unpaid_leave_deductible [read,write]\nCOVERED   payroll.exemption_reason_min_length [read,validate,write]\nCOVERED   deductions.reason_min_length [behaviour,read,validate,write]\nCOVERED   deductions.duplicate_window_hours [read,write]\nCOVERED   deductions.bulk_max_employees [read,validate,write]\nCOVERED   deductions.step_sla_hours [read,write]\nCOVERED   deductions.objection_window_days [read,validate,write]\nCOVERED   deductions.max_carry_forward_count [read,write]\nCOVERED   deductions.repeat_deduction_threshold [read,write]\nCOVERED   deductions.manager_creation_enabled [read,validate,write]\nCOVERED   deductions.missing_approver_fallback [read,validate,write]\nCOVERED   deductions.sla_breach_action [read,validate,write]\nCOVERED   deductions.objection_blocks_approval [read,write]\nCOVERED   bonuses.reason_min_length [behaviour,read,validate,write]\nCOVERED   bonuses.duplicate_window_hours [read,write]\nCOVERED   bonuses.bulk_max_employees [read,write]\nCOVERED   bonuses.manager_creation_enabled [read,write]\nCOVERED   bonuses.missing_approver_fallback [read,validate,write]\nCOVERED   financial_exemptions.reason_min_length [read,write]\nCOVERED   financial_exemptions.attachment_threshold_days [read,write]\nCOVERED   financial_exemptions.max_per_employee_year [read,write]\nCOVERED   financial_exemptions.max_pct_per_grantor [read,validate,write]\nCOVERED   financial_exemptions.cooldown_hours [read,validate,write]\nCOVERED   financial_exemptions.repeat_alert_count [read,write]\nCOVERED   financial_exemptions.type_drain_alert_pct [read,write]\nCOVERED   financial_exemptions.department_manager_enabled [read,validate,write]\nCOVERED   auth.two_factor_enabled [read]\nCOVERED   auth.domain_autoprovision_enabled [read]\nEXTRA     evil.injected_key [write]\nEXTRA     settings/leave-types [behaviour]\nEXTRA     branches [behaviour]\nEXTRA     departments [behaviour]\nEXTRA     teams [behaviour]\nEXTRA     catalogs/job-titles [behaviour]\nEXTRA     catalogs/grades [behaviour]\nEXTRA     catalogs/cost-centers [behaviour]\nEXTRA     catalogs/asset-types [behaviour]\nEXTRA     catalogs/permission-types [behaviour]\nEXTRA     catalogs/doc-types [behaviour]\nEXTRA     catalogs/shifts [behaviour]\nEXTRA     catalogs/work-schedules [behaviour]\nEXTRA     attendance/schedule-rules [behaviour]\nEXTRA     catalogs/holidays [behaviour]\nEXTRA     roles [behaviour]\nEXTRA     users [behaviour]\nEXTRA     settings/approval-chains [behaviour]\nEXTRA     settings/request-types [behaviour]\nEXTRA     deductions/types [behaviour]\nEXTRA     bonuses/types [behaviour]\n===== TOTALS: keys=136 covered=136 checks=360 passed=360 failed=0 =====\n\nreport: D:\\projects\\hr_system\\api\\test\\codex-review-round6-settings-findings.cjs\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settings_test_ddc6f2170d0b311f\"}\n"
  ]
}
