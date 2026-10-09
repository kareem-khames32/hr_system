module.exports = {
  "selected": [
    "codex-review-p6a-public",
    "codex-review-p6a-webhooks"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 12,
      "failed": 0,
      "passed": 12,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 12,
      "suites": 0
    },
    "duration_ms": 13640.5923
  },
  "results": [
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9234.0068,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 158.7796,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 175.0441,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 727.6241,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 336.0984,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "P6A-P01: public employee exposes ids of units and manager currently outside key branches",
      "ms": 105.8943,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9316.5428,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 133.4259,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 386.6012,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 161.5611,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 390.0813,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "P6A-W01: hostname is resolved again after the public-address check (local TLS receiver only)",
      "ms": 115.0487,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"foreignDepartmentId\":3,\"foreignTeamId\":1,\"foreignManagerId\":3}",
    "Cleanup verified: hr_public_api_test_2c16148d0bf7bc6e is absent from sys.databases.",
    "{\"checkedPublicAddress\":true,\"secondResolution\":true,\"localReceiverRequests\":1,\"outcome\":\"SENT\"}",
    "Cleanup verified: hr_webhooks_test_72e70e0081d77a5f is absent from sys.databases.",
    "tests 12",
    "suites 0",
    "pass 12",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13640.5923"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_2c16148d0bf7bc6e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_2c16148d0bf7bc6e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_72e70e0081d77a5f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_72e70e0081d77a5f\"}\n"
  ]
}
