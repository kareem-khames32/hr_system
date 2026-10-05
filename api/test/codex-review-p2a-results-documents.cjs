module.exports = {
  "selected": [
    "codex-review-p2a-documents",
    "employee-export",
    "settlement-pending-obligations"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 11,
      "failed": 1,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 11,
      "suites": 0
    },
    "duration_ms": 25233.2738
  },
  "results": [
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-documents.integration.cjs",
      "ms": 2933.8056,
      "pass": false,
      "error": "test failed"
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-01: كود البصمة تاني عمود، والأكواد والجوال والهوية نص بأصفارهم، والتواريخ زي ما هي، والأسماء بدل الأرقام",
      "ms": 6515.0431,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-02: من غير payroll.view ولا employees.edit مفيش أي عمود مالي — مش فاضي، مش موجود أصلًا",
      "ms": 29.9882,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-03: نطاق الفرع: موظف فرع تاني مابيطلعش حتى لو رقمه اتبعت، والترتيب زي الشاشة",
      "ms": 92.7357,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-04: من غير employees.view مرفوض، وقائمة فاضية أو أرقام غلط مرفوضة برسالة",
      "ms": 19.7444,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-05: التصدير GET (قراءة بس) ومتعرّف قبل «:id» — مش بيتقري كأنه رقم موظف",
      "ms": 0.4443,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-01: الإعداد مقفول افتراضيًا — التصفية زي ما كانت: مفيش بند قيود، واللقطة من غير مفاتيح القيود، والقيود زي ما هي",
      "ms": 6749.6173,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-02: مفتوح — القيود اللي شهرها بعد آخر شهر بتدخل بندين، واللي في شهر آخر يوم والمسير لسه مش معتمد والمحجوز والملغي والمعلّق لأ؛ والاعتماد بيعلّمها مستهلكة",
      "ms": 411.8301,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-03: مسير آخر شهر معتمد — قيد شهر آخر يوم والقيد الفوري اللي برّه المسير بيتلموا كمان (مفيش مسير هياخدهم)",
      "ms": 254.6358,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-04: قيد اتلغى بعد التوليد، أو الإعداد اتفتح بعد التوليد — الاعتماد 409 «أعد توليد البنود» من غير أي تغيير",
      "ms": 558.6799,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-05: بند القيود المعدّل يدويًا بيترفض عند الاعتماد، والتسوية اليدوية جنبه مسموحة",
      "ms": 363.8218,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-documents.integration.cjs",
      "ms": 2933.8056,
      "pass": false,
      "error": "test failed"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_employee_export_test_e1927be7c5949944 is absent from sys.databases.",
    "Cleanup verified: hr_settlement_obligations_test_ec22b7529fd1894e is absent from sys.databases.",
    "tests 11",
    "suites 0",
    "pass 10",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 25233.2738"
  ],
  "stdout": [
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\codex-review-p2a-documents.integration.cjs:237\n",
    "test('P2A every generated archived document stores the SHA256 of its actual bytes',async()=>{const rows=await ds.query('SELECT storedName,sha256 FROM stored_files WHERE entityType='hr_document'');assert.ok(rows.length>0);for(const row of rows)assert.equal(row.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(uploads,row.storedName))).digest('hex'))})\n",
    "                                                                                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n",
    "\n",
    "SyntaxError: missing ) after argument list\n",
    "    at wrapSafe (node:internal/modules/cjs/loader:1692:18)\n",
    "    at Module._compile (node:internal/modules/cjs/loader:1735:20)\n",
    "    at node:internal/modules/cjs/loader:1893:10\n",
    "    at Object.require.extensions.<computed> [as .js] (D:\\projects\\hr_system\\api\\node_modules\\ts-node\\src\\index.ts:1608:43)\n",
    "    at Module.load (node:internal/modules/cjs/loader:1481:32)\n",
    "    at Module._load (node:internal/modules/cjs/loader:1300:12)\n",
    "    at TracingChannel.traceSync (node:diagnostics_channel:328:14)\n",
    "    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)\n",
    "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)\n",
    "    at node:internal/main/run_main_module:33:47\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_export_test_e1927be7c5949944\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_export_test_e1927be7c5949944\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settlement_obligations_test_ec22b7529fd1894e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settlement_obligations_test_ec22b7529fd1894e\"}\n"
  ]
}
