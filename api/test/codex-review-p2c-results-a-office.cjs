module.exports = {
  "selected": [
    "codex-review-p2c-office-edges",
    "codex-review-p2c-office",
    "codex-review-p2c-office-units",
    "file-upload-type"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 23,
      "failed": 5,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 23,
      "suites": 0
    },
    "duration_ms": 31726.7913
  },
  "results": [
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A real relationships: actual macro with commented normal type is rejected, renamed main Word and Excel are accepted",
      "ms": 5031.1463,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'e95b5da1e11202c1b63c6d92006998db671bb4f3b15630ced5e17b9dfdabfd9e'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'e95b5da1e11202c1b63c6d92006998db671bb4f3b15630ced5e17b9dfdabfd9e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'e95b5da1e11202c1b63c6d92006998db671bb4f3b15630ced5e17b9dfdabfd9e'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:15:81)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A OLE mini-stream must exist, not merely fit declared root size",
      "ms": 143.5846,
      "pass": false,
      "error": "A directory entry without addressable stream bytes must not upload as Word",
      "cause": "A directory entry without addressable stream bytes must not upload as Word",
      "stack": "AssertionError [ERR_ASSERTION]: A directory entry without addressable stream bytes must not upload as Word\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:31:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A normal OLE stream FAT loop cannot substitute for the declared data chain",
      "ms": 24.5077,
      "pass": false,
      "error": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "cause": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:39:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A XML validator must reject a mismatched closing root and non-XML suffix",
      "ms": 51.0625,
      "pass": false,
      "error": "Strict package metadata parser should reject malformed XML",
      "cause": "Strict package metadata parser should reject malformed XML",
      "stack": "AssertionError [ERR_ASSERTION]: Strict package metadata parser should reject malformed XML\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office.integration.cjs",
      "name": "P2B A genuine Word and Excel fixtures still upload with content hashes",
      "ms": 4946.9749,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-office.integration.cjs",
      "name": "P2B A an XML comment must not override an actual macro document content type",
      "ms": 33.7827,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-office.integration.cjs",
      "name": "P2B A an OLE storage named WordDocument is not a document stream",
      "ms": 22.1858,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-01: كل نوع من محتواه، والـZIP العادي والنص والـHTML مش من الأنواع",
      "ms": 2.2205,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-02: الامتداد لازم يطابق المحتوى — PDF متسمي .jpg مرفوض، والحروف الكبيرة والامتدادين لـJPG مقبولين",
      "ms": 1.0839,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-03: Word وExcel القديم بيتحسموا من تيارات الحاوية، مش من الامتداد",
      "ms": 0.4415,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-04: الإعدادات — نوع مقفول بيترفض باسمه، والحد بالميجا من 1 لـ50 والغلط = 10، وقيمة الأنواع بتتراجع",
      "ms": 0.267,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-05 (CRP2A-B02): أرشيف ZIP مش Word ولا Excel إلا بجزئه الرئيسي الفعلي ونوعه المعلن — التعليق والمحتوى والاسم لوحدهم مايكفوش",
      "ms": 9.2283,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-06 (CRP2A-B02، مسح الصنف): حاوية OLE مش Word ولا Excel إلا بتيارها — MSI أو رسالة Outlook أو حاوية مقطوعة مرفوضين، ومفيش خطأ على أي بايتات",
      "ms": 16.1539,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-07 (CRP2B-A-B01): ملفات تعريف الحزمة بتتقري كـXML فعلي وبترتيب Office — التعليق وCDATA وقيمة خاصية تانية والتصريح المكرر والجزء الطُّعم مابيغيّروش النوع",
      "ms": 15.6706,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-08 (CRP2B-A-B01): حاوية OLE بشجرة دليلها — تيار في الجذر مش مجلد ولا تيار جوه مجلد، وحجمه مش صفر، والروابط المكسورة مرفوضة",
      "ms": 1.8804,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 7726.2221,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 61.8587,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\file-upload-type.integration.cjs:157:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 80.7857,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 92.8541,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 122.6233,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 70.9084,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت",
      "ms": 140.1034,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-08 (CRP2B-A-B01): الرفع الفعلي — نوع ماكرو بتصريح Word جوه تعليق XML مش Word، ومجلد OLE اسمه WordDocument مش Word، والسليم لسه بيتقبل",
      "ms": 272.6167,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A real relationships: actual macro with commented normal type is rejected, renamed main Word and Excel are accepted",
      "ms": 5031.1463,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'e95b5da1e11202c1b63c6d92006998db671bb4f3b15630ced5e17b9dfdabfd9e'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'e95b5da1e11202c1b63c6d92006998db671bb4f3b15630ced5e17b9dfdabfd9e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'e95b5da1e11202c1b63c6d92006998db671bb4f3b15630ced5e17b9dfdabfd9e'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:15:81)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A OLE mini-stream must exist, not merely fit declared root size",
      "ms": 143.5846,
      "pass": false,
      "error": "A directory entry without addressable stream bytes must not upload as Word",
      "cause": "A directory entry without addressable stream bytes must not upload as Word",
      "stack": "AssertionError [ERR_ASSERTION]: A directory entry without addressable stream bytes must not upload as Word\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:31:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A normal OLE stream FAT loop cannot substitute for the declared data chain",
      "ms": 24.5077,
      "pass": false,
      "error": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "cause": "A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: A repeated sector is not a complete 4096-byte stream\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:39:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2c-office-edges.integration.cjs",
      "name": "P2C A XML validator must reject a mismatched closing root and non-XML suffix",
      "ms": 51.0625,
      "pass": false,
      "error": "Strict package metadata parser should reject malformed XML",
      "cause": "Strict package metadata parser should reject malformed XML",
      "stack": "AssertionError [ERR_ASSERTION]: Strict package metadata parser should reject malformed XML\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-office-edges.integration.cjs:47:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 61.8587,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\file-upload-type.integration.cjs:157:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"missing-mini-stream-data\",\"outcomes\":[{\"label\":\"stream-has-no-start\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"},{\"label\":\"mini-fat-absent\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"},{\"label\":\"root-data-absent\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"},{\"label\":\"stream-start-outside-root\",\"detected\":\"doc\",\"status\":201,\"storedMime\":\"application/msword\"}]}",
    "{\"case\":\"fat-stream-loop\",\"start\":2,\"declaredBytes\":4096,\"distinctReachableDataSectors\":1,\"status\":201}",
    "{\"case\":\"not-well-formed-package-xml\",\"outcomes\":[{\"label\":\"mismatched-root\",\"status\":201},{\"label\":\"trailing-content\",\"status\":201}]}",
    "{\"case\":\"xml-comment-office-type\",\"actualContentType\":\"application/vnd.ms-word.document.macroEnabled.main+xml\",\"controlStatus\":400,\"commentStatus\":400}",
    "{\"case\":\"ole-storage-not-stream\",\"entryKind\":1,\"status\":400}",
    "Cleanup verified: hr_file_upload_test_ab40c35483cdb213 is absent from sys.databases.",
    "tests 23",
    "suites 0",
    "pass 18",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 31726.7913"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_office_edges_test_1ff76c2181fae0a3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_office_edges_test_1ff76c2181fae0a3\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_office_edges_test_1ff76c2181fae0a3\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_office_test_2a371350c284f417\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_office_test_2a371350c284f417\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_office_test_2a371350c284f417\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_ab40c35483cdb213\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_ab40c35483cdb213\"}\n"
  ]
}
