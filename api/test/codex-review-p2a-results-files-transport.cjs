module.exports = {
  "selected": [
    "file-upload-type"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 9900.3102
  },
  "results": [
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 6285.1354,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 45.3921,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 49.4488,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 60.6262,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 122.1554,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 58.8327,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_file_upload_test_083111f82f61fc83 is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9900.3102"
  ],
  "stdout": [
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_083111f82f61fc83\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_083111f82f61fc83\"}\n"
  ]
}
