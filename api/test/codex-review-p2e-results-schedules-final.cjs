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
    "duration_ms": 15446.0212
  },
  "results": [
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-1: نسختين من الـAPI — نفس المهمة في نفس اللحظة بتشتغل مرة واحدة، وتاني في نفس الدقيقة بيتعدّى، والدقيقة الجاية بتشتغل",
      "ms": 7454.0022,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-2: الفشل بيتسجل «فشلت» برسالته والجاية بتشتغل، والموديول المقفول مفيش تشغيل ولا صف، والأساسية بتشتغل دايمًا",
      "ms": 50.862,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-3: شاشة المهام لحساب الشركة بإدارة الإعدادات (الفرع ومن غير الصلاحية 403)، ومسح الأقدم من 30 يوم",
      "ms": 119.2808,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-4: ترحيل 079 — الملف سليم والأسماء بتاعة الكيان، وقبله المهام شغالة بقفلها من غير سجل، والمُرحّل بيضيف الجدول من غير فرق، وآمن للتكرار",
      "ms": 4851.6914,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_scheduled_jobs_test_181db05173e565e1 is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15446.0212"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_scheduled_jobs_test_181db05173e565e1\"}\n",
    "REVIEW_PROGRESS {\"inertCronDefinitions\":14,\"started\":false}\n",
    "REVIEW_PROGRESS {\"inertCronDefinitions\":14,\"started\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_scheduled_jobs_test_181db05173e565e1\"}\n"
  ]
}
