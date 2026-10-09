module.exports = {
  "selected": [
    "codex-review-p6b-webhooks"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 23865.2038
  },
  "results": [
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 8717.183,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 110.6209,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 295.3105,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 130.9586,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 323.8173,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "P6B-W01: checked DNS result is passed to transport once; mixed/private results rejected",
      "ms": 68.2045,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "P6B-W04: interrupted response blocks the actual queue worker and its next unrelated job",
      "ms": 11575.9753,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"dnsCalls\":5,\"pinnedSends\":[{\"host\":\"p6b-pinned.invalid\",\"pin\":{\"address\":\"93.184.216.34\",\"family\":4}},{\"host\":\"p6b-pinned.invalid\",\"pin\":{\"address\":\"2606:4700:4700::1111\",\"family\":6}}],\"mixedAndPrivateBlocked\":true,\"externalConnections\":0}",
    "{\"responseAborted\":true,\"elapsedMs\":11522,\"timeoutMs\":10000,\"workerStillRunning\":true,\"nextJobRan\":0,\"jobs\":[{\"jobType\":\"webhooks.deliver\",\"status\":\"RUNNING\",\"attempts\":1},{\"jobType\":\"p6b.probe\",\"status\":\"PENDING\",\"attempts\":0}]}",
    "Cleanup verified: hr_webhooks_test_94df905d35198006 is absent from sys.databases.",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23865.2038"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_94df905d35198006\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_94df905d35198006\"}\n"
  ]
}
