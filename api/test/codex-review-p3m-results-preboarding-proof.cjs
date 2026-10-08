module.exports = {
  "selected": [
    "codex-review-p3m-preboarding"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 10212.1758
  },
  "results": [
    {
      "file": "codex-review-p3m-preboarding.integration.cjs",
      "name": "P3M-B01: preboarding role is employee but structural manager still reads another employee task",
      "ms": 7501.83,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-preboarding.integration.cjs",
      "name": "P3M-B02: restricted manager cannot read a task proof even as its creator and uploader",
      "ms": 171.5776,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_preboarding_test_92557f2cafd3e97a",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10212.1758"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_preboarding_test_92557f2cafd3e97a\"}\n",
    "REVIEW_MEASURE {\"case\":\"B01\",\"role\":\"employee\",\"preboarding\":true,\"roleTask\":404,\"subordinateTask\":404}\n",
    "REVIEW_MEASURE {\"case\":\"B02\",\"foreignCreatorTask\":404,\"foreignUploadedProof\":404,\"ownTask\":200,\"ownProof\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_preboarding_test_92557f2cafd3e97a\"}\n"
  ]
}
