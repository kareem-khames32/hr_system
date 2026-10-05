module.exports = {
  "selected": [
    "codex-review-p2c-office-edges",
    "codex-review-p2c-office-units",
    "file-upload-type",
    "audit-log",
    "codex-review-p2c-closure"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 30,
      "failed": 3,
      "passed": 27,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 30,
      "suites": 0
    },
    "duration_ms": 40123.7454
  },
  "results": [
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A real relationships: actual macro with commented normal type is rejected, renamed main Word and Excel are accepted",
      "ms": 5537.8944,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A OLE mini-stream must exist, not merely fit declared root size",
      "ms": 108.5637,
      "pass": false,
      "error": "A directory entry without addressable stream bytes must not upload as Word",
      "cause": "A directory entry without addressable stream bytes must not upload as Word",
      "stack": "AssertionError [ERR_ASSERTION]: A directory entry without addressable stream bytes must not upload as Word\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:31:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A normal OLE stream FAT loop cannot substitute for the declared data chain",
      "ms": 19.7036,
      "pass": false,
      "error": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "cause": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:39:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A XML validator must reject a mismatched closing root and non-XML suffix",
      "ms": 43.6394,
      "pass": false,
      "error": "Strict package metadata parser should reject malformed XML",
      "cause": "Strict package metadata parser should reject malformed XML",
      "stack": "AssertionError [ERR_ASSERTION]: Strict package metadata parser should reject malformed XML\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-01: كل نوع من محتواه، والـZIP العادي والنص والـHTML مش من الأنواع",
      "ms": 1.9174,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-02: الامتداد لازم يطابق المحتوى — PDF متسمي .jpg مرفوض، والحروف الكبيرة والامتدادين لـJPG مقبولين",
      "ms": 0.887,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-03: Word وExcel القديم بيتحسموا من تيارات الحاوية، مش من الامتداد",
      "ms": 0.3636,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-04: الإعدادات — نوع مقفول بيترفض باسمه، والحد بالميجا من 1 لـ50 والغلط = 10، وقيمة الأنواع بتتراجع",
      "ms": 0.2328,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-05 (CRP2A-B02): أرشيف ZIP مش Word ولا Excel إلا بجزئه الرئيسي الفعلي ونوعه المعلن — التعليق والمحتوى والاسم لوحدهم مايكفوش",
      "ms": 7.6318,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-06 (CRP2A-B02، مسح الصنف): حاوية OLE مش Word ولا Excel إلا بتيارها — MSI أو رسالة Outlook أو حاوية مقطوعة مرفوضين، ومفيش خطأ على أي بايتات",
      "ms": 13.7798,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-07 (CRP2B-A-B01): ملفات تعريف الحزمة بتتقري كـXML فعلي وبترتيب Office — التعليق وCDATA وقيمة خاصية تانية والتصريح المكرر والجزء الطُّعم مابيغيّروش النوع",
      "ms": 4.7207,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-08 (CRP2B-A-B01): حاوية OLE بشجرة دليلها — تيار في الجذر مش مجلد ولا تيار جوه مجلد، وحجمه مش صفر، والروابط المكسورة مرفوضة",
      "ms": 1.2566,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 6297.3879,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 56.874,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 53.0153,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 57.7461,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 74.7996,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 46.8769,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت",
      "ms": 110.4322,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-08 (CRP2B-A-B01): الرفع الفعلي — نوع ماكرو بتصريح Word جوه تعليق XML مش Word، ومجلد OLE اسمه WordDocument مش Word، والسليم لسه بيتقبل",
      "ms": 231.2542,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 7002.9153,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 211.4783,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 34.276,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 185.2926,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 239.279,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-closure.integration.cjs",
      "name": "P2A audit and queue reject unauthenticated or out of scope viewers; allowed reads retain audit values",
      "ms": 5069.7694,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-closure.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 77.0009,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-closure.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 84.813,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-closure.integration.cjs",
      "name": "P2A concurrent repeated outbox keys and two workers produce one event and one job effect",
      "ms": 87.3825,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-closure.integration.cjs",
      "name": "P2A a failed file hash update leaves neither a database row nor a new disk file",
      "ms": 63.5342,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A OLE mini-stream must exist, not merely fit declared root size",
      "ms": 108.5637,
      "pass": false,
      "error": "A directory entry without addressable stream bytes must not upload as Word",
      "cause": "A directory entry without addressable stream bytes must not upload as Word",
      "stack": "AssertionError [ERR_ASSERTION]: A directory entry without addressable stream bytes must not upload as Word\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:31:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A normal OLE stream FAT loop cannot substitute for the declared data chain",
      "ms": 19.7036,
      "pass": false,
      "error": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "cause": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:39:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A XML validator must reject a mismatched closing root and non-XML suffix",
      "ms": 43.6394,
      "pass": false,
      "error": "Strict package metadata parser should reject malformed XML",
      "cause": "Strict package metadata parser should reject malformed XML",
      "stack": "AssertionError [ERR_ASSERTION]: Strict package metadata parser should reject malformed XML\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"relationships-controls\",\"macroStatus\":400,\"accepted\":[\"docx\",\"xlsx\"]}",
    "{\"case\":\"missing-mini-stream-data\",\"outcomes\":[{\"label\":\"stream-has-no-start\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"},{\"label\":\"mini-fat-absent\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"},{\"label\":\"root-data-absent\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"},{\"label\":\"stream-start-outside-root\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"}]}",
    "{\"case\":\"fat-stream-loop\",\"start\":2,\"declaredBytes\":4096,\"distinctReachableDataSectors\":1,\"status\":201}",
    "{\"case\":\"not-well-formed-package-xml\",\"outcomes\":[{\"label\":\"mismatched-root\",\"status\":201},{\"label\":\"trailing-content\",\"status\":201}]}",
    "Cleanup verified: hr_file_upload_test_bea2a35bada6a565 is absent from sys.databases.",
    "Cleanup verified: hr_audit_log_test_b7eb8db3c04c4805 is absent from sys.databases.",
    "{\"case\":\"permission-audit-atomicity\",\"httpStatus\":500,\"grants\":[],\"effectivePayrollView\":false,\"auditRows\":0}",
    "{\"case\":\"zip-comment-file-type\",\"status\":400,\"storedRows\":0,\"containsOfficePart\":false,\"shaMatches\":null}",
    "tests 30",
    "suites 0",
    "pass 27",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 40123.7454"
  ],
  "stdout": [
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_office_edges_test_bb602766efd6faee\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_office_edges_test_bb602766efd6faee\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_office_edges_test_bb602766efd6faee\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_bea2a35bada6a565\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_bea2a35bada6a565\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_b7eb8db3c04c4805\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_b7eb8db3c04c4805\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_a_closure_test_ef6bfc9cbd9b80b0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_a_closure_test_ef6bfc9cbd9b80b0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_a_closure_test_ef6bfc9cbd9b80b0\"}\n"
  ]
}
