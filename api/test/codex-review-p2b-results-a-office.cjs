module.exports = {
  "selected": [
    "codex-review-p2b-office",
    "codex-review-p2b-a-units"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 2,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 8844.8466
  },
  "results": [
    {
      "file": "codex-review-p2b-office.integration.cjs",
      "name": "P2B A genuine Word and Excel fixtures still upload with content hashes",
      "ms": 5489.0086,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-office.integration.cjs",
      "name": "P2B A an XML comment must not override an actual macro document content type",
      "ms": 40.0747,
      "pass": false,
      "error": "A commented Override is not a declared part type; the actual declaration remains macro-enabled\n\n201 !== 400\n",
      "cause": "A commented Override is not a declared part type; the actual declaration remains macro-enabled\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: A commented Override is not a declared part type; the actual declaration remains macro-enabled\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-office.integration.cjs:22:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2b-office.integration.cjs",
      "name": "P2B A an OLE storage named WordDocument is not a document stream",
      "ms": 30.1033,
      "pass": false,
      "error": "OLE storage names cannot establish the Word document stream\n\n201 !== 400\n",
      "cause": "OLE storage names cannot establish the Word document stream\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: OLE storage names cannot establish the Word document stream\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-office.integration.cjs:32:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-01: كل نوع من محتواه، والـZIP العادي والنص والـHTML مش من الأنواع",
      "ms": 1.4638,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-02: الامتداد لازم يطابق المحتوى — PDF متسمي .jpg مرفوض، والحروف الكبيرة والامتدادين لـJPG مقبولين",
      "ms": 1.0048,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-03: Word وExcel القديم بيتحسموا من تيارات الحاوية، مش من الامتداد",
      "ms": 0.3682,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-04: الإعدادات — نوع مقفول بيترفض باسمه، والحد بالميجا من 1 لـ50 والغلط = 10، وقيمة الأنواع بتتراجع",
      "ms": 0.2703,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-05 (CRP2A-B02): أرشيف ZIP مش Word ولا Excel إلا بجزئه الرئيسي الفعلي ونوعه المعلن — التعليق والمحتوى والاسم لوحدهم مايكفوش",
      "ms": 9.3025,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-06 (CRP2A-B02، مسح الصنف): حاوية OLE مش Word ولا Excel إلا بتيارها — MSI أو رسالة Outlook أو حاوية مقطوعة مرفوضين، ومفيش خطأ على أي بايتات",
      "ms": 11.9869,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2b-office.integration.cjs",
      "name": "P2B A an XML comment must not override an actual macro document content type",
      "ms": 40.0747,
      "pass": false,
      "error": "A commented Override is not a declared part type; the actual declaration remains macro-enabled\n\n201 !== 400\n",
      "cause": "A commented Override is not a declared part type; the actual declaration remains macro-enabled\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: A commented Override is not a declared part type; the actual declaration remains macro-enabled\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-office.integration.cjs:22:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2b-office.integration.cjs",
      "name": "P2B A an OLE storage named WordDocument is not a document stream",
      "ms": 30.1033,
      "pass": false,
      "error": "OLE storage names cannot establish the Word document stream\n\n201 !== 400\n",
      "cause": "OLE storage names cannot establish the Word document stream\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: OLE storage names cannot establish the Word document stream\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-office.integration.cjs:32:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"xml-comment-office-type\",\"actualContentType\":\"application/vnd.ms-word.document.macroEnabled.main+xml\",\"controlStatus\":400,\"commentStatus\":201,\"storedMime\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\"}",
    "{\"case\":\"ole-storage-not-stream\",\"entryKind\":1,\"status\":201,\"mime\":\"application/msword\"}",
    "tests 9",
    "suites 0",
    "pass 7",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8844.8466"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2b_office_test_5d5107b24e6a5a9e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2b_office_test_5d5107b24e6a5a9e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2b_office_test_5d5107b24e6a5a9e\"}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n"
  ]
}
