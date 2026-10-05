module.exports = {
  "selected": [
    "codex-review-p2d-office-edges",
    "codex-review-p2d-office-units",
    "file-upload-type",
    "codex-review-p2d-office-real",
    "codex-review-p2d-closure",
    "audit-log",
    "queue-outbox"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 40,
      "failed": 0,
      "passed": 40,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 40,
      "suites": 0
    },
    "duration_ms": 59955.2376
  },
  "results": [
    {
      "file": "codex-review-p2d-office-edges.integration.cjs",
      "name": "P2C A real relationships: actual macro with commented normal type is rejected, renamed main Word and Excel are accepted",
      "ms": 5137.5149,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-office-edges.integration.cjs",
      "name": "P2C A OLE mini-stream must exist, not merely fit declared root size",
      "ms": 108.6418,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-office-edges.integration.cjs",
      "name": "P2C A normal OLE stream FAT loop cannot substitute for the declared data chain",
      "ms": 13.0878,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-office-edges.integration.cjs",
      "name": "P2C A XML validator must reject a mismatched closing root and non-XML suffix",
      "ms": 35.6902,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-01: كل نوع من محتواه، والـZIP العادي والنص والـHTML مش من الأنواع",
      "ms": 3.4708,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-02: الامتداد لازم يطابق المحتوى — PDF متسمي .jpg مرفوض، والحروف الكبيرة والامتدادين لـJPG مقبولين",
      "ms": 1.304,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-03: Word وExcel القديم بيتحسموا من تيارات الحاوية، مش من الامتداد",
      "ms": 0.522,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-04: الإعدادات — نوع مقفول بيترفض باسمه، والحد بالميجا من 1 لـ50 والغلط = 10، وقيمة الأنواع بتتراجع",
      "ms": 0.2928,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-05 (CRP2A-B02): أرشيف ZIP مش Word ولا Excel إلا بجزئه الرئيسي الفعلي ونوعه المعلن — التعليق والمحتوى والاسم لوحدهم مايكفوش",
      "ms": 9.0853,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-06 (CRP2A-B02، مسح الصنف): حاوية OLE مش Word ولا Excel إلا بتيارها — MSI أو رسالة Outlook أو حاوية مقطوعة مرفوضين، ومفيش خطأ على أي بايتات",
      "ms": 16.4614,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-07 (CRP2B-A-B01): ملفات تعريف الحزمة بتتقري كـXML فعلي وبترتيب Office — التعليق وCDATA وقيمة خاصية تانية والتصريح المكرر والجزء الطُّعم مابيغيّروش النوع",
      "ms": 6.161,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-08 (CRP2B-A-B01): حاوية OLE بشجرة دليلها — تيار في الجذر مش مجلد ولا تيار جوه مجلد، وحجمه مش صفر، والروابط المكسورة مرفوضة",
      "ms": 1.7009,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-09 (CRP2C-A-B01): تيار OLE لازم بايتاته تتقري فعلًا — السلسلة المصغّرة والعادية من غير قطاع ناقص ولا متكرر، وبداية الصيغة",
      "ms": 60.8883,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-10 (CRP2C-A-N01): قارئ XML صارم زي أي قارئ فعلي، والجزء الرئيسي بيبدأ بعنصر جذر نوعه",
      "ms": 37.1395,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 7360.3269,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 52.9895,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 76.946,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 68.6464,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 81.0579,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 63.6126,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت",
      "ms": 126.7175,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-08 (CRP2B-A-B01): الرفع الفعلي — نوع ماكرو بتصريح Word جوه تعليق XML مش Word، ومجلد OLE اسمه WordDocument مش Word، والسليم لسه بيتقبل",
      "ms": 217.0684,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-09 (CRP2C-A-B01): الرفع الفعلي — تيار Word من غير بايتات تتقري، أو قطاع بيشاور على نفسه، أو محتواه مش Word = مرفوض؛ وملف تعريف مش XML سليم مرفوض",
      "ms": 175.0019,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-office-real.integration.cjs",
      "name": "P2C A installed Office templates are read-only controls; in-memory document variants retain genuine package structure",
      "ms": 139.4158,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-closure.integration.cjs",
      "name": "P2A audit and queue reject unauthenticated or out of scope viewers; allowed reads retain audit values",
      "ms": 5583.1773,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-closure.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 81.4933,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-closure.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 85.4218,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-closure.integration.cjs",
      "name": "P2A concurrent repeated outbox keys and two workers produce one event and one job effect",
      "ms": 95.4484,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-closure.integration.cjs",
      "name": "P2A a failed file hash update leaves neither a database row nor a new disk file",
      "ms": 62.0257,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 7633.9356,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 275.1026,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 29.642,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 169.6649,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 218.9326,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش",
      "ms": 7588.8441,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام",
      "ms": 133.396,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها",
      "ms": 145.1761,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع",
      "ms": 171.0681,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها",
      "ms": 2344.0182,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس",
      "ms": 26.6528,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"relationships-controls\",\"macroStatus\":400,\"accepted\":[\"docx\",\"xlsx\"]}",
    "{\"case\":\"missing-mini-stream-data\",\"outcomes\":[{\"label\":\"stream-has-no-start\",\"detected\":null,\"status\":400},{\"label\":\"mini-fat-absent\",\"detected\":null,\"status\":400},{\"label\":\"root-data-absent\",\"detected\":null,\"status\":400},{\"label\":\"stream-start-outside-root\",\"detected\":null,\"status\":400}]}",
    "{\"case\":\"fat-stream-loop\",\"start\":2,\"declaredBytes\":4096,\"distinctReachableDataSectors\":1,\"status\":400}",
    "{\"case\":\"not-well-formed-package-xml\",\"outcomes\":[{\"label\":\"mismatched-root\",\"status\":400},{\"label\":\"trailing-content\",\"status\":400}]}",
    "Cleanup verified: hr_file_upload_test_6ec5133ed53210c9 is absent from sys.databases.",
    "{\"case\":\"installed-office-readonly\",\"samples\":{\"doc\":0,\"dot\":3,\"xls\":0,\"dotx\":5,\"xltx\":5,\"pptx\":0,\"potx\":5},\"sourceFilesUnmodified\":true,\"templateTypeChangedOnlyInMemory\":true}",
    "{\"case\":\"permission-audit-atomicity\",\"httpStatus\":500,\"grants\":[],\"effectivePayrollView\":false,\"auditRows\":0}",
    "{\"case\":\"zip-comment-file-type\",\"status\":400,\"storedRows\":0,\"containsOfficePart\":false,\"shaMatches\":null}",
    "Cleanup verified: hr_audit_log_test_9a1e40074195f55e is absent from sys.databases.",
    "Cleanup verified: hr_queue_outbox_test_fffa75b47886ec42 is absent from sys.databases.",
    "tests 40",
    "suites 0",
    "pass 40",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 59955.2376"
  ],
  "stdout": [
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2d_office_edges_test_8374ff4936bf2f99\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2d_office_edges_test_8374ff4936bf2f99\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2d_office_edges_test_8374ff4936bf2f99\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_6ec5133ed53210c9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_6ec5133ed53210c9\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2d_a_closure_test_07486effecf723ce\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2d_a_closure_test_07486effecf723ce\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2d_a_closure_test_07486effecf723ce\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_9a1e40074195f55e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_9a1e40074195f55e\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_outbox_test_fffa75b47886ec42\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_outbox_test_fffa75b47886ec42\"}\n"
  ]
}
