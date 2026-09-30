module.exports = {
  "selected": [
    "org-filter-context"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 8244.8307
  },
  "results": [
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-01: حساب فرع النصر — فرعه ووحداته وفرقه المفعّلة وموظفينه بكل حالاتهم، ومفيش رقم ولا اسم من فرع برّه نطاقه",
      "ms": 5737.2834,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-02: حساب الشركة كلها ومدير النظام — كل الفروع المفعّلة، والإدارة التنفيذية ظاهرة أب لأقسام الفروع التانية",
      "ms": 34.37,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-03: حساب فرعين (الرئيسي والنصر) — الأب في فرع جوه نطاقه بيظهر، والمعادي لأ",
      "ms": 15.727,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-04: الصلاحية — أي صلاحية عرض شاشة فيها الفلتر تكفي، ومن غيرها 403، والحساب بلا فرع نطاقه فاضي",
      "ms": 19.8022,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-context.integration.cjs",
      "name": "OFC-05: تضييق الخادم بمعاملات الفلتر — جوه النطاق بس، والبرّه مابيرجّعش حاجة، والقيمة الغلط 400",
      "ms": 123.645,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_org_filter_test_16447efbd5bb2e86 is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8244.8307"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_org_filter_test_16447efbd5bb2e86\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_org_filter_test_16447efbd5bb2e86\"}\n"
  ]
}
