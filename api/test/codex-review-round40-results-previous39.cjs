module.exports = {
  "selected": [
    "codex-review-round39-payslip",
    "codex-review-round39-mixed-report",
    "codex-review-round39-bonus-control",
    "codex-review-round39-text"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 13,
      "failed": 0,
      "passed": 13,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 13,
      "suites": 0
    },
    "duration_ms": 32664.4046
  },
  "results": [
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact",
      "ms": 7457.0058,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
      "ms": 103.0463,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
      "ms": 90.1103,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-detail: no foreign payroll period through a current in-scope payroll",
      "ms": 94.0159,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 events: no foreign payroll period through a current in-scope payroll",
      "ms": 50.425,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 BRANCH mixed report retains allowed run head without foreign organization names",
      "ms": 6705.7224,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 DEPARTMENT mixed report retains allowed run head without foreign organization names",
      "ms": 3516.3172,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round39-bonus-control.integration.cjs",
      "name": "CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it",
      "ms": 5046.9094,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
      "ms": 0.7144,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
      "ms": 0.1712,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
      "ms": 0.5733,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة",
      "ms": 0.5166,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد",
      "ms": 78.071,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"real-restored-ledger-controls\",\"foreignRunRead\":403,\"currentRunRead\":200,\"ledgerLabel\":\"إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance\",\"obligationDetailLabel\":\"إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance\",\"companyLabel\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\",\"net\":9067.89,\"restoredAmount\":67.89,\"companyAndSelfPreserved\":true,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"payslip\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[],\"companyRefs\":[{\"path\":\"$.obligationDetails[0].label\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.lines.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.lines.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"run-lines\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[],\"companyRefs\":[{\"path\":\"$.columns.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.columns.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.rows[0].earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"},{\"path\":\"$.rows[0].earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"run-detail\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[],\"companyRefs\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"in-scope-payroll-foreign-text\",\"route\":\"events\",\"originalForeignPeriod\":\"2026-07\",\"currentVisiblePeriod\":\"2026-11\",\"directForeignRead\":403,\"routeStatus\":200,\"leaks\":[],\"companyRefs\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"mixed-head-foreign-organization-label\",\"kind\":\"BRANCH\",\"fullRunRead\":403,\"mixedHeadAllowed\":true,\"hiddenName\":\"فرع باء المحجوب\",\"listHead\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع ألف، وغيرها خارج نطاق صلاحيتك\"},\"summaryScopeLabel\":\"فرع: فرع ألف، وغيرها خارج نطاق صلاحيتك\",\"storedNet\":18000,\"storedUnchanged\":true}",
    "{\"case\":\"mixed-head-foreign-organization-label\",\"kind\":\"DEPARTMENT\",\"fullRunRead\":403,\"mixedHeadAllowed\":true,\"hiddenName\":\"CR39 confidential department B\",\"listHead\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":\"2026-08\",\"status\":\"PAID\",\"startDate\":\"2026-07-23\",\"endDate\":\"2026-08-22\",\"scopeLabel\":\"قسم: CR39 visible department A، وغيرها خارج نطاق صلاحيتك\"},\"summaryScopeLabel\":\"قسم: CR39 visible department A، وغيرها خارج نطاق صلاحيتك\",\"storedNet\":36000,\"storedUnchanged\":true}",
    "{\"case\":\"bonus-payout-period-control\",\"directForeignRead\":403,\"hiddenStatus\":\"مصروف\",\"hiddenPayout\":{\"state\":\"PAID\",\"label\":\"مصروف\",\"runId\":null,\"period\":null},\"companyPayout\":{\"state\":\"PAID\",\"label\":\"مصروف\",\"runId\":1,\"period\":\"2026-07\"},\"selfPayout\":{\"state\":\"PAID\",\"label\":\"مصروف\",\"runId\":1,\"period\":\"2026-07\"},\"amount\":123.45,\"net\":9123.45,\"storedUnchanged\":true}",
    "tests 13",
    "suites 0",
    "pass 13",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32664.4046"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_payslip_test_06df1f50dd9ea08b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_payslip_test_06df1f50dd9ea08b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_payslip_test_06df1f50dd9ea08b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_mixed_test_5138b934c43f0b10\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_mixed_test_5138b934c43f0b10\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_mixed_test_5138b934c43f0b10\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_bonus_test_acdfb67662d105d3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_bonus_test_acdfb67662d105d3\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_bonus_test_acdfb67662d105d3\"}\n"
  ]
}
