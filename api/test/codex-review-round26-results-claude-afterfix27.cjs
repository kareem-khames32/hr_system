module.exports = {
  "selected": [
    "codex-review-round26-independent",
    "codex-review-round26-ui"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 25,
      "failed": 0,
      "passed": 25,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 25,
      "suites": 0
    },
    "duration_ms": 19062.3204
  },
  "results": [
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 full-scope correction views preserve the old serialized contract and employee self links",
      "ms": 6897.4849,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption",
      "ms": 1882.118,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 dated organisation must govern the carried exemption just as it governs supplementary membership",
      "ms": 1857.6501,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event",
      "ms": 3272.7325,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "candidates: a branch user lists only his branch (and unassigned), creates into his branch, and cannot edit another branch",
      "ms": 1.7441,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions run screen: a run with no member in the user branch is out of scope (snapshot or legacy branch)",
      "ms": 0.6225,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions service wires the run scope gate into runView and candidates, and filters recalc ids by branch",
      "ms": 0.6096,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a branch-scoped call touches only that branch employees; null keeps the company-wide job",
      "ms": 1.1508,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a multi-branch scope touches exactly those branches",
      "ms": 0.3544,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "payroll draft calculate / recalculate check the run branch scope before revealing its status",
      "ms": 0.8996,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "النداءات عبر ملف API واحد بمسارات الخادم، ولا fetch مباشر، والمبالغ بالمنسّق الموحد",
      "ms": 1.0418,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "اللوحة: الإنشاء يرسل بصمة المعاينة، ومعطل قبل معاينة حالية غير ممنوعة وسبب مستوفٍ، وموانع الخادم تُعرض",
      "ms": 0.6815,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "شاشة المسير (تبسيط الرواتب): لوحات العكس والتكميلي ولقطة السياسة ومحرك الحساب و«بلا مسير» والإعفاء المالي لا تُعرض، وملفاتها وأنواع الـAPI باقية",
      "ms": 1.4194,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "القسيمة وقسائمي (تبسيط الرواتب): بلا شريط عكس الصرف ولا قسيمة التكميلي ولا علامتيهما، وسجل المسير (غير المعروض) يبقى يسمي أحداث التصحيح",
      "ms": 0.5465,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "السلف وتقارير الرواتب: القسط المُلغى بعكس الصرف وحركة REVERSAL بتسميات عربية، وتقرير المسيرات (تبسيط الرواتب) بلا مسيرات العكس والتكميلي وسطورها، والـAPI يبقى يسميها",
      "ms": 1.2339,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تنبيهات الإعفاء عند العكس: إعفاء الحضور يُنقل للتكميلي، و«كل الخصومات» لا يُنقل، والإسقاط أو التأجيل المنفذ يبقى؛ بلا إعفاء لا تنبيه",
      "ms": 0.3222,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نقل الإعفاء للتكميلي: خصومات الحضور (التأخير والنقص والغياب نوعًا أو يومًا) فقط",
      "ms": 0.0874,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "حالة السلفة عند إعادة فتحها بالعكس: المسجلة في حركة الصرف أولًا، وللحركات القديمة من تاريخ الصرف، والتعارض مانع",
      "ms": 0.0932,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نوع المسير: null وأي قيمة أخرى = أصلي؛ العكس والتكميلي بأسمائهما العربية",
      "ms": 0.0547,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "سبب التصحيح: 20 حرفًا على الأقل وثلاث كلمات مختلفة، والرفض برمز PAYRUN-CORRECTION-REASON",
      "ms": 0.1078,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "لقطة البند المعكوس: مبالغ بخانتين، والبصمة ثابتة وتتغير بأي مبلغ أو تفصيل",
      "ms": 0.3377,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تقرير التسويات: المصروف − المعكوس المنفذ = الصافي الفعلي، وفرق التسوية = التكميلي المصروف − المعكوس المنفذ",
      "ms": 0.5018,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "شرط SQL للبند المعكوس: سطر منفذ للمسير والموظف، ويرفض أي تعبير غير عمود أو معامل",
      "ms": 0.137,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: الأصل المستحق بعد العكس مع ابن ترحيل مُلغى (REVERSED) صالح بلا رصيد للابن",
      "ms": 0.4559,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: ترحيل جديد بعد العكس يعيد تفعيل الابن نفسه؛ الابن المُلغى لا يُحتسب ابنًا حيًا، ويُرفض المُلغى بلا أصل أو المدفوع",
      "ms": 0.3824,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"full-contract\",\"fullCorrectionDeepEqual\":true,\"fullItemDeepEqual\":true,\"readers\":[\"branch\",\"company\",\"admin\",\"employee-own\"],\"net\":7319.17}",
    "{\"case\":\"carry-before-transfer\",\"savedExemptionBranch\":1,\"memberBranch\":2,\"oldBranchRunStatus\":403,\"oldBranchExemptionStatus\":403,\"newBranchExemptionStatus\":200,\"revokeStatus\":403,\"storedExemptionStatus\":\"ACTIVE\",\"netBefore\":9000,\"netAfter\":9000}",
    "{\"case\":\"dated-carry-organisation\",\"effectiveTransfer\":\"2026-09-01\",\"payrollPeriod\":\"2026-07\",\"currentBranch\":2,\"memberBranch\":1,\"exemptionBranch\":1,\"rightfulStatus\":200,\"foreignStatus\":403}",
    "{\"case\":\"mixed-supplementary-event\",\"headerVisible\":true,\"headerNet\":null,\"foreignExemptionDirectStatus\":403,\"individualEventForeignId\":null,\"nearCopyId\":7,\"foreignCopyId\":8,\"scopedCarriedExemptions\":[{\"fromExemptionId\":5,\"exemptionId\":7,\"employeeId\":4}],\"companyCopies\":2}",
    "tests 25",
    "suites 0",
    "pass 25",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 19062.3204"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r26_independent_test_0c09874f53e2fdc9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r26_independent_test_0c09874f53e2fdc9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r26_independent_test_0c09874f53e2fdc9\"}\n"
  ]
}
