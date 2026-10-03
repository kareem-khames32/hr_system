module.exports = {
  "selected": [
    "codex-review-round41-independent",
    "codex-review-round41-text",
    "codex-review-round40-key-boundary",
    "codex-review-round40-scope-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 18,
      "failed": 0,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 18,
      "suites": 0
    },
    "duration_ms": 35694.8453
  },
  "results": [
    {
      "file": "codex-review-round41-independent.integration.cjs",
      "name": "CR41 closures: seven real readers, opaque stable keys, permitted self/company text, exact money and stored history",
      "ms": 8458.2863,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round41-independent.integration.cjs",
      "name": "CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip",
      "ms": 2301.6547,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
      "ms": 0.6038,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
      "ms": 0.1416,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
      "ms": 0.493,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة",
      "ms": 0.7544,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40-B01: بصمة المفتاح المحجوب معتمة — مش hash علني للنص الأصلي، فتجربة الشهور من الرد بس مابتطابقش أي شهر",
      "ms": 2.4091,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40: قايمة فترات بعد «مسير» — كل فترة مخفية بتتشال والمرئية تفضل",
      "ms": 0.1319,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40/CR41 (شبكة الأمان): موظفي الرد من الرد نفسه بس، وكل نص بفترات موظفه هو (مش اتحاد الرد) — والأرقام والتواريخ زي ما هي",
      "ms": 10.7825,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد",
      "ms": 80.2332,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history",
      "ms": 6140.6992,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 52.5399,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 25.0117,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
      "ms": 50.8627,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
      "ms": 54.9835,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 TEAM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 5779.5327,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 CUSTOM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 1695.2649,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 1535.2714,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"CR41-seven-reader-closures\",\"routes\":[\"payslip\",\"lines\",\"run\",\"overview\",\"review\",\"ledger\",\"register\"],\"status\":200,\"oldForeignRunStatus\":403,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~ce261d34931c7560\",\"publicCandidates\":432,\"algorithms\":4,\"matches\":[],\"net\":9067.89,\"reversal\":-9067.89,\"companySelfPreserved\":true,\"storedUnchanged\":true}",
    "{\"case\":\"CR41-query-payroll-month-oracle\",\"actorHasPayrollView\":false,\"ownPayslipStatus\":200,\"foreignItemStatus\":404,\"observations\":[{\"target\":\"nonexistent\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"foreignNoPayroll\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"foreignAugust\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"self\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"foreignJuly\",\"retainsOwnJuly\":true,\"identical\":true}],\"ownLineBefore\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance\",\"ownLineAfter\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance\",\"net\":9067.89,\"companyUnchanged\":true,\"storedUnchanged\":true}",
    "{\"case\":\"line-key-rendering-controls\",\"hiddenKeys\":[\"BASIC\",\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~26f101862a4d1a75\"],\"rowColumnMapping\":true,\"stableReads\":true,\"net\":9067.89,\"companySelfPreserved\":true,\"storedUnchanged\":true}",
    "{\"case\":\"recover-hidden-period-from-key\",\"route\":\"payslip\",\"directForeignRead\":403,\"currentRead\":200,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~26f101862a4d1a75\",\"readerOnlyCandidateSpace\":432,\"decoded\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"recover-hidden-period-from-key\",\"route\":\"run-lines\",\"directForeignRead\":403,\"currentRead\":200,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~26f101862a4d1a75\",\"readerOnlyCandidateSpace\":432,\"decoded\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"adjacent-reader-foreign-period\",\"route\":\"overview-lines\",\"url\":\"/payroll/overview/lines?period=2026-11\",\"foreignRead\":403,\"currentRead\":200,\"leaks\":[],\"companyRefs\":[{\"path\":\"$.columns.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.columns.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"adjacent-reader-foreign-period\",\"route\":\"approval-review\",\"url\":\"/payroll/approval-chain/runs/3/review\",\"foreignRead\":403,\"currentRead\":200,\"leaks\":[],\"companyRefs\":[{\"path\":\"$.rows[0].earningLines[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earningLines[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"TEAM\",\"branchLabel\":\"فريق: CR40 allowed team، وغيرها خارج نطاق صلاحيتك\",\"companyLabel\":\"فريق: CR40 allowed team، CR40 private team\",\"multiLabel\":\"فريق: CR40 allowed team، CR40 private team\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[null,null],\"storedUnchanged\":true}",
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"CUSTOM\",\"branchLabel\":\"قائمة مخصّصة\",\"companyLabel\":\"قائمة مخصّصة (2 موظف)\",\"multiLabel\":\"قائمة مخصّصة\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[2,\"فرع باء المحجوب\"],\"storedUnchanged\":true}",
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"COST_CENTER\",\"branchLabel\":\"مركز تكلفة: CR40 company cost center\",\"companyLabel\":\"مركز تكلفة: CR40 company cost center\",\"multiLabel\":\"مركز تكلفة: CR40 company cost center\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[null,null],\"storedUnchanged\":true}",
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 35694.8453"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r41_payslip_test_e9e30501bba34bcf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r41_payslip_test_e9e30501bba34bcf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r41_payslip_test_e9e30501bba34bcf\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_payslip_test_0b498b1dc68288dc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_payslip_test_0b498b1dc68288dc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_payslip_test_0b498b1dc68288dc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_scopes_test_b03601c6a538fb2e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_scopes_test_b03601c6a538fb2e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_scopes_test_b03601c6a538fb2e\"}\n"
  ]
}
