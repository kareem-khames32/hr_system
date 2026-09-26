module.exports = {
  "selected": [
    "payroll-work-pressure-allowance",
    "public-holiday-audience"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 19,
      "failed": 0,
      "passed": 19,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 19,
      "suites": 0
    },
    "duration_ms": 34136.7743
  },
  "results": [
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-M1: migration 071 through the real migrator on a database with an old employee and old monthly salary history — additive, zero schema delta, old fingerprints intact, re-runnable, and a wrong shape stops with its code",
      "ms": 10507.8751,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-A: 6000 + 1000 with an absent day, lateness, shortfall, one unpaid day, overtime, a typed day-deduction, a 7% cap and social insurance — every base is 6000 and the 1000 is paid whole",
      "ms": 893.3057,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-B: debts bigger than the salary plus a loan installment — the 1000 is still paid whole; approval, payment, the employee payslip and profile all carry it",
      "ms": 1016.964,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-C: a joiner mid-period gets the allowance prorated by the same service-day rule as the salary; the control without it differs by exactly that amount",
      "ms": 359.0593,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-D: a dated change of the allowance is a dated salary change — October pays 1000 and November 1500 from the monthly salary history",
      "ms": 433.9265,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-E: end of service in the settlement preview equals a control employee without the allowance; the last-month salary line carries it through the run item",
      "ms": 496.3149,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-G: bulk update from Excel — employee code + «بدل ضغط العمل» is a dated salary change with audit, and the next run pays it",
      "ms": 468.4439,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-N: the allowance never covers a negative effect net — unpaid leave beyond the salary still blocks approval although the paid net is positive",
      "ms": 367.0801,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-P: a salary change sent without the allowance (an older client) keeps the current allowance instead of zeroing it",
      "ms": 60.4859,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-L: an employee without the allowance (the old one from before 071) keeps the item, breakdown and snapshot exactly as before",
      "ms": 302.3572,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-M1: migration 070 through the real migrator on a database with old holidays and dated calendar versions — additive, zero schema delta, re-runnable, and a wrong shape stops with its code",
      "ms": 10282.6346,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-M2: no calendar drift after the column — the current global calendar still matches its latest version with the same fingerprint, strict resolution works, and calendar changes keep working",
      "ms": 704.5327,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-01: a holiday for employee X only — X's day is a holiday with no absence; Y in the same branch works and gets an absence without a punch; strict payroll calendar agrees",
      "ms": 364.3772,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-02: leave requests count the day for Y and skip it for X, and /attendance/working-days agrees",
      "ms": 220.9849,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-03: department (with sub-departments), team and whole-branch audiences; the old everyone-holiday is unchanged; the branch calendar counts only «the whole branch»",
      "ms": 585.3,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-04: editing «تسري على» recomputes the stored days (who left the audience becomes absent, who joined becomes a holiday); a rename keeps it; bad targets are rejected with nothing written",
      "ms": 1693.6662,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-05: holiday-work orders — a targeted-holiday date is accepted when a targeted employee has the day off and rejected when nobody targeted does",
      "ms": 313.4622,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-06: lists — managers see every holiday with its audience; an employee sees everyone-holidays and his own targeted ones only, without anyone else's ids",
      "ms": 86.462,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-holiday-audience.integration.cjs",
      "name": "HA-07: a branch-scoped settings account sees targeted holidays of its own branches only — in the holidays list and in the global calendar context — while the fingerprint stays the full one",
      "ms": 44.2193,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "باليد: 6000 + إضافي 75 − تأخير 20 − نقص 12.50 − غياب 200 − بلا أجر 200 − مصنف 187.50 (سقف 420 − 232.50) − تأمينات 660 = 4795 + البدل 1000 = 5795.00",
    "b1: دين 9000 → اتحصل 6000 ورحّل 3000، القسط 0، الصافي = البدل 1000. b2: دين 5800 وقسط 200 من الست، الصافي = البدل 1000.",
    "المعيَّن 10 أكتوبر: 22 يوم خدمة ÷ 30 — الراتب 4400.00 والبدل 733.33 بنفس القاعدة.",
    "مكافأة نهاية الخدمة للاتنين 6254.79؛ راتب آخر شهر 7000 مقابل 6000 (البدل بيوصل التصفية جوه صافي بند المسير بس).",
    "Cleanup verified: hr_work_pressure_test_ab508918f909246f removed.",
    "Cleanup verified: hr_public_holiday_audience_test_526d796ab2f026a9 removed.",
    "tests 19",
    "suites 0",
    "pass 19",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 34136.7743"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_work_pressure_test_ab508918f909246f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_work_pressure_test_ab508918f909246f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_holiday_audience_test_526d796ab2f026a9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_holiday_audience_test_526d796ab2f026a9\"}\n"
  ]
}
