module.exports = {
  "selected": [
    "codex-review-p6b-ai-assist"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 19920.6402
  },
  "results": [
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 8633.6245,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 238.6334,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 125.8212,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 107.001,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 17.4869,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A05: alternate real-world free-text contact representations still reach provider",
      "ms": 50.7402,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 78.1604,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A07: assist outcome still accepts a stale identity after rebinding before its conditional update",
      "ms": 70.7206,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"asciiPhoneRedacted\":true,\"ibanRedacted\":true}",
    "{\"representation\":\"Persian numerals\",\"providerReceivedContact\":true}",
    "{\"representation\":\"local phone\",\"providerReceivedContact\":true}",
    "{\"representation\":\"separated phone\",\"providerReceivedContact\":true}",
    "{\"race\":\"assist-outcome\",\"status\":200,\"proposalEmployee\":3,\"currentEmployee\":4,\"decision\":\"ACCEPTED\"}",
    "Cleanup verified: hr_aiassistx_test_a35cb8ea07420ba7 is absent from sys.databases.",
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 19920.6402"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_a35cb8ea07420ba7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_a35cb8ea07420ba7\"}\n"
  ]
}
