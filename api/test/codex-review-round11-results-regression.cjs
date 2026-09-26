module.exports = {
  "selected": [
    "codex-review-round10-independent",
    "manager-of-direct-manager"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 16,
      "failed": 0,
      "passed": 16,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 16,
      "suites": 0
    },
    "duration_ms": 20390.6185
  },
  "results": [
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 skip-level uses the same team then department fallback and routes confidential requests only to the resolved second manager",
      "ms": 6503.7569,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 top-step deduplication works when the removed step is first and the surviving named step is second",
      "ms": 135.3104,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 three-person manager cycle created through employee API must stop skip-level submission",
      "ms": 176.2078,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 executive parent does not expose its fields to branch B or extend its holiday and payroll scope",
      "ms": 866.9598,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 simultaneous linking and executive reassignment cannot leave a foreign child under an ordinary parent",
      "ms": 50.7066,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 6186.6957,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 99.5264,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 139.6442,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 48.0989,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 51.6454,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 37.8298,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
      "ms": 206.5673,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
      "ms": 137.9679,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 93.5518,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)",
      "ms": 24.7487,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق",
      "ms": 17.7379,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_skip_level_test_16777ae3dd0c1024 is absent from sys.databases.",
    "tests 16",
    "suites 0",
    "pass 16",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 20390.6185"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r10independent_test_ddc2e9ffc71dba5a\"}\n",
    "CR10_EVIDENCE {\"case\":\"team-department-fallback-confidential\",\"expected\":4,\"resolved\":4,\"directManagerBlocked\":true,\"finalStatus\":\"COMPLETED\"}\n",
    "CR10_EVIDENCE {\"case\":\"dedup-first-step\",\"remainingStepOrder\":2,\"finalStatus\":\"COMPLETED\",\"repeatRejected\":true}\n",
    "CR10_EVIDENCE {\"case\":\"three-person-cycle\",\"patchStatuses\":[200,200,200],\"submission\":400,\"resolved\":[],\"expected\":\"reject circular manager structure\"}\n",
    "CR10_EVIDENCE {\"case\":\"tree-boundary-real-calculation\",\"foreignParentFieldsHidden\":true,\"foreignLink\":403,\"foreignHolidayOrder\":400,\"payrollEmployees\":[2],\"net\":6000,\"foreignSalaryExcluded\":9000}\n",
    "CR10_EVIDENCE {\"case\":\"department-tree-race\",\"statuses\":[200,400],\"foreignParentInvariant\":true,\"executiveCount\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r10independent_test_ddc2e9ffc71dba5a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r10independent_test_ddc2e9ffc71dba5a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skip_level_test_16777ae3dd0c1024\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skip_level_test_16777ae3dd0c1024\"}\n"
  ]
}
