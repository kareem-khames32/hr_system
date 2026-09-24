module.exports = {
  "selected": [
    "payroll-compensation",
    "payroll-corrections"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 3,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 8798.4866
  },
  "results": [
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ F1: HTTP employee creation accepts phone and work nature without manufacturing otherAllowance",
      "ms": 5495.2797,
      "pass": false,
      "error": "{\"message\":\"اسم البنك مطلوب لما الصرف فيه تحويل بنكي\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"اسم البنك مطلوب لما الصرف فيه تحويل بنكي\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"اسم البنك مطلوب لما الصرف فيه تحويل بنكي\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-compensation.integration.cjs:226:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: HTTP settlement preview and saved EOS agree with the payroll gross for all six independent components",
      "ms": 906.8842,
      "pass": false,
      "error": "[{\"label\":\"مكافأة نهاية الخدمة — إنهاء من صاحب العمل (2.00 سنة: 2×0.5 شهر)\",\"type\":\"CREDIT\",\"amount\":8600},{\"label\":\"راتب آخر شهر 2026-07 (مسير #1) — مصروف مع التصفية\",\"type\":\"CREDIT\",\"amount\":8600}]\n\n2 !== 1\n",
      "cause": "[{\"label\":\"مكافأة نهاية الخدمة — إنهاء من صاحب العمل (2.00 سنة: 2×0.5 شهر)\",\"type\":\"CREDIT\",\"amount\":8600},{\"label\":\"راتب آخر شهر 2026-07 (مسير #1) — مصروف مع التصفية\",\"type\":\"CREDIT\",\"amount\":8600}]\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: [{\"label\":\"مكافأة نهاية الخدمة — إنهاء من صاحب العمل (2.00 سنة: 2×0.5 شهر)\",\"type\":\"CREDIT\",\"amount\":8600},{\"label\":\"راتب آخر شهر 2026-07 (مسير #1) — مصروف مع التصفية\",\"type\":\"CREDIT\",\"amount\":8600}]\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-compensation.integration.cjs:409:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 5868.3245,
      "pass": false,
      "error": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "cause": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\api\\test\\payroll-corrections.integration.cjs:44:10)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-corrections.integration.cjs:471:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ F1: HTTP employee creation accepts phone and work nature without manufacturing otherAllowance",
      "ms": 5495.2797,
      "pass": false,
      "error": "{\"message\":\"اسم البنك مطلوب لما الصرف فيه تحويل بنكي\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"اسم البنك مطلوب لما الصرف فيه تحويل بنكي\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"اسم البنك مطلوب لما الصرف فيه تحويل بنكي\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-compensation.integration.cjs:226:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: HTTP settlement preview and saved EOS agree with the payroll gross for all six independent components",
      "ms": 906.8842,
      "pass": false,
      "error": "[{\"label\":\"مكافأة نهاية الخدمة — إنهاء من صاحب العمل (2.00 سنة: 2×0.5 شهر)\",\"type\":\"CREDIT\",\"amount\":8600},{\"label\":\"راتب آخر شهر 2026-07 (مسير #1) — مصروف مع التصفية\",\"type\":\"CREDIT\",\"amount\":8600}]\n\n2 !== 1\n",
      "cause": "[{\"label\":\"مكافأة نهاية الخدمة — إنهاء من صاحب العمل (2.00 سنة: 2×0.5 شهر)\",\"type\":\"CREDIT\",\"amount\":8600},{\"label\":\"راتب آخر شهر 2026-07 (مسير #1) — مصروف مع التصفية\",\"type\":\"CREDIT\",\"amount\":8600}]\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: [{\"label\":\"مكافأة نهاية الخدمة — إنهاء من صاحب العمل (2.00 سنة: 2×0.5 شهر)\",\"type\":\"CREDIT\",\"amount\":8600},{\"label\":\"راتب آخر شهر 2026-07 (مسير #1) — مصروف مع التصفية\",\"type\":\"CREDIT\",\"amount\":8600}]\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-compensation.integration.cjs:409:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 5868.3245,
      "pass": false,
      "error": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "cause": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\api\\test\\payroll-corrections.integration.cjs:44:10)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-corrections.integration.cjs:471:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_payroll_comp_test_b11e7ba5c921d4a2 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_payroll_corrections_test_98919e7c48a4660b is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8798.4866"
  ],
  "stdout": []
}
