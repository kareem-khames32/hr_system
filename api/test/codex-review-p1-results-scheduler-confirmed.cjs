module.exports = {
  "selected": [
    "scheduled-jobs"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 18818.6813
  },
  "results": [
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-1: نسختين من الـAPI — نفس المهمة في نفس اللحظة بتشتغل مرة واحدة، وتاني في نفس الدقيقة بيتعدّى، والدقيقة الجاية بتشتغل",
      "ms": 9486.6087,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-2: الفشل بيتسجل «فشلت» برسالته والجاية بتشتغل، والموديول المقفول مفيش تشغيل ولا صف، والأساسية بتشتغل دايمًا",
      "ms": 48.7321,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-3: شاشة المهام لحساب الشركة بإدارة الإعدادات (الفرع ومن غير الصلاحية 403)، ومسح الأقدم من 30 يوم",
      "ms": 157.1629,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-4: ترحيل 079 — الملف سليم والأسماء بتاعة الكيان، وقبله المهام شغالة بقفلها من غير سجل، والمُرحّل بيضيف الجدول من غير فرق، وآمن للتكرار",
      "ms": 5333.7007,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_scheduled_jobs_test_e5291939788d007f is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18818.6813"
  ],
  "stdout": [
    "CRP1_SCHEDULER real schedule metadata registered; no cron timers, startup catch-up or listeners started\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_scheduled_jobs_test_e5291939788d007f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_scheduled_jobs_test_e5291939788d007f\"}\n"
  ]
}
