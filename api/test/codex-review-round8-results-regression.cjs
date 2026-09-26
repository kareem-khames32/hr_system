module.exports = {
  "selected": [
    "codex-review-round7-holiday-edges",
    "public-holiday-audience",
    "holiday-work",
    "payroll-live-attendance"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 28,
      "failed": 0,
      "passed": 28,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 28,
      "suites": 0
    },
    "duration_ms": 77481.2512
  },
  "results": [
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4331.7755,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 177.8042,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-M1: migration 070 through the real migrator on a database with old holidays and dated calendar versions — additive, zero schema delta, re-runnable, and a wrong shape stops with its code",
      "ms": 12103.407,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-M2: no calendar drift after the column — the current global calendar still matches its latest version with the same fingerprint, strict resolution works, and calendar changes keep working",
      "ms": 1136.0388,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-01: a holiday for employee X only — X's day is a holiday with no absence; Y in the same branch works and gets an absence without a punch; strict payroll calendar agrees",
      "ms": 574.4753,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-02: leave requests count the day for Y and skip it for X, and /attendance/working-days agrees",
      "ms": 449.8017,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-03: department (with sub-departments), team and whole-branch audiences; the old everyone-holiday is unchanged; the branch calendar counts only «the whole branch»",
      "ms": 1223.4934,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-04: editing «تسري على» recomputes the stored days (who left the audience becomes absent, who joined becomes a holiday); a rename keeps it; bad targets are rejected with nothing written",
      "ms": 3453.6591,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-05: holiday-work orders — a targeted-holiday date is accepted when a targeted employee has the day off and rejected when nobody targeted does",
      "ms": 1081.8826,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-06: lists — managers see every holiday with its audience; an employee sees everyone-holidays and his own targeted ones only, without anyone else's ids",
      "ms": 240.5174,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-07: a branch-scoped settings account sees targeted holidays of its own branches only — in the holidays list and in the global calendar context — while the fingerprint stays the full one",
      "ms": 111.3861,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-08: an employee who moved to another department keeps his dated department holiday, and a holiday-work order for him that day is accepted (CR7-N01); a colleague never in that department is still rejected",
      "ms": 524.4759,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-09: the payroll live schedule evidence of a branch-A employee never carries a holiday targeted to branch B — name, date or branch (CR7-B01); the branch-B employee still sees his own",
      "ms": 203.4767,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 12425.0395,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 10238.3741,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1561.1636,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 226.4885,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 1335.7118,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1302.6801,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 4973.9047,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: اليوم الفعلي المحسوب والبصمتان ينتجان ثواني دقيقة وتقويمًا مؤرخًا دون كتابة",
      "ms": 6968.5284,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: 10:00:59 بعد المرونة يحفظ3659 ثانية من بداية الدوام",
      "ms": 246.7871,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: غياب محفوظ صريح يثبت بينما عدم وجود صف لا ينشئ غيابًا",
      "ms": 375.3425,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: فجوة التنظيم المؤرخ تمنع تحويل الحضور الصحيح إلى مصدر مالي",
      "ms": 204.3002,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: تعديل الأعمدة أو استقبال دليل أحدث يمنع الاعتماد على الحساب القديم",
      "ms": 485.6711,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: الإجازة غير المدفوعة والتصحيح غير المثبت يظهران دون صفوف أو خصومات مصطنعة",
      "ms": 345.3926,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "HTTP: المصدر موثق جزئيًا ويظل تنفيذ المسير مغلقًا ولا يتغير عند القراءة",
      "ms": 380.7237,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "HTTP: صلاحية حساب الرواتب ونطاق الموظف مستقلان عن السياسة العامة",
      "ms": 509.3536,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_public_holiday_audience_test_8389fde812bcc07a removed.",
    "Cleanup verified: hr_holiday_work_test_23833ec84aabdd0c is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_attendance_proof_test_ebf5f09b2c93df37",
    "tests 28",
    "suites 0",
    "pass 28",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 77481.2512"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7holiday_test_aaf0e69c38488da8\"}\n",
    "CR7_EVIDENCE {\"case\":\"dated-department-holiday-work\",\"calendar\":\"HOLIDAY\",\"status\":201,\"body\":{\"today\":\"2026-09-26\",\"canSeeAmounts\":true,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR7 work on historical holiday\",\"targetLevel\":\"employees\",\"branchId\":1,\"targetIds\":[1],\"targetText\":\"CR7 A — R7MOVE\",\"dates\":[\"2026-09-15\"],\"multiplier\":1.5,\"status\":\"ACTIVE\",\"note\":null,\"sourceRequestId\":null,\"createdAt\":\"2026-09-26T17:18:18.750Z\",\"createdByName\":\"Review Admin\",\"updatedAt\":null,\"cancelledAt\":null,\"cancelReason\":null,\"cancelledByName\":null,\"canEdit\":true,\"canCancel\":true,\"summary\":{\"targetedEmployees\":1,\"cameEmployees\":0,\"countedDays\":0,\"totalHours\":0,\"totalAmount\":0,\"pastDates\":1},\"rows\":[]},\"overtime\":{\"recomputed\":0,\"failed\":0}}}\n",
    "CR7_EVIDENCE {\"case\":\"branch-live-source-isolation\",\"sourceStatus\":200,\"leaked\":false,\"matches\":[]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7holiday_test_aaf0e69c38488da8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7holiday_test_aaf0e69c38488da8\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_holiday_audience_test_8389fde812bcc07a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_holiday_audience_test_8389fde812bcc07a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_23833ec84aabdd0c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_23833ec84aabdd0c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_attendance_proof_test_ebf5f09b2c93df37\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_attendance_proof_test_ebf5f09b2c93df37\"}\n"
  ]
}
