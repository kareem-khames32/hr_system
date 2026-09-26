module.exports = {
  "selected": [
    "codex-review-round8-boundaries",
    "codex-review-round8-holiday-limit",
    "codex-review-round7-holiday-edges",
    "public-holiday-audience",
    "holiday-work",
    "payroll-live-attendance"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 34,
      "failed": 0,
      "passed": 34,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 34,
      "suites": 0
    },
    "duration_ms": 142948.3827
  },
  "results": [
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 foreign holiday values are hidden; permitted employee and holiday remain readable",
      "ms": 8726.9567,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 hidden foreign holiday must not survive in sourceRefs or expose its covered date",
      "ms": 314.3288,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 corrupt audience produces a generic issue without the holiday name or branch description",
      "ms": 113.8734,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 stored run, policy snapshot, events, payslip and reports do not publish foreign holiday values",
      "ms": 1700.8735,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-boundaries.integration.cjs",
      "name": "CR8 dated holiday survives a future calendar edit while a non-target employee stays a working day",
      "ms": 1091.8164,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round8-holiday-limit.integration.cjs",
      "name": "CR8 branch order is valid when its only holiday recipient is candidate 501",
      "ms": 13430.5174,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 9088.8661,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 391.583,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-M1: migration 070 through the real migrator on a database with old holidays and dated calendar versions — additive, zero schema delta, re-runnable, and a wrong shape stops with its code",
      "ms": 14836.6304,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-M2: no calendar drift after the column — the current global calendar still matches its latest version with the same fingerprint, strict resolution works, and calendar changes keep working",
      "ms": 1680.783,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-01: a holiday for employee X only — X's day is a holiday with no absence; Y in the same branch works and gets an absence without a punch; strict payroll calendar agrees",
      "ms": 729.595,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-02: leave requests count the day for Y and skip it for X, and /attendance/working-days agrees",
      "ms": 403.8132,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-03: department (with sub-departments), team and whole-branch audiences; the old everyone-holiday is unchanged; the branch calendar counts only «the whole branch»",
      "ms": 1278.5795,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-04: editing «تسري على» recomputes the stored days (who left the audience becomes absent, who joined becomes a holiday); a rename keeps it; bad targets are rejected with nothing written",
      "ms": 4790.0497,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-05: holiday-work orders — a targeted-holiday date is accepted when a targeted employee has the day off and rejected when nobody targeted does",
      "ms": 1026.2661,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-06: lists — managers see every holiday with its audience; an employee sees everyone-holidays and his own targeted ones only, without anyone else's ids",
      "ms": 205.3273,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-07: a branch-scoped settings account sees targeted holidays of its own branches only — in the holidays list and in the global calendar context — while the fingerprint stays the full one",
      "ms": 115.2606,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-08: an employee who moved to another department keeps his dated department holiday, and a holiday-work order for him that day is accepted (CR7-N01); a colleague never in that department is still rejected",
      "ms": 687.9583,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-09: the payroll live schedule evidence of a branch-A employee never carries a holiday targeted to branch B — name, date or branch (CR7-B01); the branch-B employee still sees his own",
      "ms": 236.6155,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 10408.6596,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 16706.4135,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 2509.3654,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 456.3975,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 2517.7521,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 2754.1814,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 10577.3615,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: اليوم الفعلي المحسوب والبصمتان ينتجان ثواني دقيقة وتقويمًا مؤرخًا دون كتابة",
      "ms": 10888.0702,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: 10:00:59 بعد المرونة يحفظ3659 ثانية من بداية الدوام",
      "ms": 624.6843,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: غياب محفوظ صريح يثبت بينما عدم وجود صف لا ينشئ غيابًا",
      "ms": 913.893,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: فجوة التنظيم المؤرخ تمنع تحويل الحضور الصحيح إلى مصدر مالي",
      "ms": 521.8749,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: تعديل الأعمدة أو استقبال دليل أحدث يمنع الاعتماد على الحساب القديم",
      "ms": 1322.4051,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: الإجازة غير المدفوعة والتصحيح غير المثبت يظهران دون صفوف أو خصومات مصطنعة",
      "ms": 1039.9713,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "HTTP: المصدر موثق جزئيًا ويظل تنفيذ المسير مغلقًا ولا يتغير عند القراءة",
      "ms": 1061.0034,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "HTTP: صلاحية حساب الرواتب ونطاق الموظف مستقلان عن السياسة العامة",
      "ms": 1253.4438,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_public_holiday_audience_test_e319374430775fdc removed.",
    "Cleanup verified: hr_holiday_work_test_1024a7b9ddcfd856 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_attendance_proof_test_469166fb594cef95",
    "tests 34",
    "suites 0",
    "pass 34",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 142948.3827"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r8boundaries_test_2b1408a034ca54e3\"}\n",
    "CR8_EVIDENCE {\"case\":\"holiday-value-isolation\",\"allowed\":200,\"hidden\":200,\"foreignEmployee\":403,\"otherRoutes\":[\"/catalogs/holidays\",\"/attendance/calendar-context?scope=GLOBAL&sourceId=0\",\"/calendar?month=2026-10\"]}\n",
    "CR8_EVIDENCE {\"case\":\"foreign-holiday-reference-date-oracle\",\"ref\":\"public_holidays:1\",\"observations\":[{\"day\":\"2026-10-14\",\"foreignReferenceReturned\":false,\"holidayRows\":0},{\"day\":\"2026-10-15\",\"foreignReferenceReturned\":false,\"holidayRows\":0},{\"day\":\"2026-10-16\",\"foreignReferenceReturned\":false,\"holidayRows\":0}]}\n",
    "CR8_EVIDENCE {\"case\":\"corrupt-audience\",\"nameHidden\":true,\"issue\":{\"code\":\"SCHEDULE_HOLIDAY_INVALID\",\"message\":\"سجل عطلة رسمية بتخصيص غير مقروء؛ حجبت تفاصيله\",\"sourceRef\":\"public_holidays\"}}\n",
    "CR8_EVIDENCE {\"case\":\"persisted-and-publishing-surfaces\",\"runId\":1,\"net\":6000,\"shadowCount\":1,\"routes\":[\"/payroll/runs/1\",\"/payroll/runs/1/policy-snapshot\",\"/payroll/runs/1/events\",\"/payroll/runs/1/bank-sheet\",\"/payroll/runs/1/pay-methods\",\"/payroll/items/1\",\"/payroll/runs\",\"/payroll/my-payslips\",\"/reports/payroll?includeDraft=true\",\"/reports/financial/payroll-register?period=2026-10&includeDraft=true\"],\"saved\":[{\"table\":\"PayrollRun\",\"rows\":1},{\"table\":\"PayrollItem\",\"rows\":1},{\"table\":\"PayrollRunMember\",\"rows\":1},{\"table\":\"PayrollRunEvent\",\"rows\":2}]}\n",
    "CR8_EVIDENCE {\"case\":\"dated-calendar-edited-later\",\"currentDate\":\"2026-10-20\",\"historicalDate\":\"2026-09-15\",\"accepted\":201,\"nonTarget\":400}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r8boundaries_test_2b1408a034ca54e3\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r8boundaries_test_2b1408a034ca54e3\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r8limit_test_0c74ddac513a5aee\"}\n",
    "CR8_EVIDENCE {\"case\":\"501-target-limit\",\"targets\":501,\"eligibleEmployee\":501,\"eligibleDay\":\"HOLIDAY\",\"visited\":1,\"eligibleVisited\":true,\"branchStatus\":201,\"branchBody\":{\"today\":\"2026-09-26\",\"canSeeAmounts\":true,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR8 valid branch holiday order\",\"targetLevel\":\"branch\",\"branchId\":1,\"targetIds\":[],\"targetText\":\"CR8 501 targets كله\",\"dates\":[\"2026-10-15\"],\"multiplier\":1.5,\"status\":\"ACTIVE\",\"note\":null,\"sourceRequestId\":null,\"createdAt\":\"2026-09-26T17:37:00.588Z\",\"createdByName\":\"Review Admin\",\"updatedAt\":null,\"cancelledAt\":null,\"cancelReason\":null,\"cancelledByName\":null,\"canEdit\":true,\"canCancel\":true,\"summary\":{\"targetedEmployees\":501,\"cameEmployees\":0,\"countedDays\":0,\"totalHours\":0,\"totalAmount\":0,\"pastDates\":0},\"rows\":[]},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"individualStatus\":201}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r8limit_test_0c74ddac513a5aee\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r8limit_test_0c74ddac513a5aee\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7holiday_test_e02688ad8236ec5a\"}\n",
    "CR7_EVIDENCE {\"case\":\"dated-department-holiday-work\",\"calendar\":\"HOLIDAY\",\"status\":201,\"body\":{\"today\":\"2026-09-26\",\"canSeeAmounts\":true,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR7 work on historical holiday\",\"targetLevel\":\"employees\",\"branchId\":1,\"targetIds\":[1],\"targetText\":\"CR7 A — R7MOVE\",\"dates\":[\"2026-09-15\"],\"multiplier\":1.5,\"status\":\"ACTIVE\",\"note\":null,\"sourceRequestId\":null,\"createdAt\":\"2026-09-26T17:37:12.852Z\",\"createdByName\":\"Review Admin\",\"updatedAt\":null,\"cancelledAt\":null,\"cancelReason\":null,\"cancelledByName\":null,\"canEdit\":true,\"canCancel\":true,\"summary\":{\"targetedEmployees\":1,\"cameEmployees\":0,\"countedDays\":0,\"totalHours\":0,\"totalAmount\":0,\"pastDates\":1},\"rows\":[]},\"overtime\":{\"recomputed\":0,\"failed\":0}}}\n",
    "CR7_EVIDENCE {\"case\":\"branch-live-source-isolation\",\"sourceStatus\":200,\"leaked\":false,\"matches\":[]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7holiday_test_e02688ad8236ec5a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7holiday_test_e02688ad8236ec5a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_holiday_audience_test_e319374430775fdc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_holiday_audience_test_e319374430775fdc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_1024a7b9ddcfd856\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_1024a7b9ddcfd856\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_attendance_proof_test_469166fb594cef95\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_attendance_proof_test_469166fb594cef95\"}\n"
  ]
}
