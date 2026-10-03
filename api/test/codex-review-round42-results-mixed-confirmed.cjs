module.exports = {
  "selected": [
    "codex-review-round42-mixed"
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
    "duration_ms": 11323.3385
  },
  "results": [
    {
      "file": "codex-review-round42-mixed.integration.cjs",
      "name": "CR42 mixed reader: each employee keeps only authorized historical text and stable row-column keys across four line readers",
      "ms": 8510.516,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round42-mixed.integration.cjs",
      "name": "CR42 query variants and client-supplied nested text do not become an employee payroll context",
      "ms": 132.177,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"CR42-mixed-real-cycle\",\"oldRunRead\":403,\"newRunRead\":200,\"observations\":[{\"employee\":1,\"hidden\":false,\"name\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR42 allowance R25-1\",\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR42 allowance R25-1\",\"net\":6011.11},{\"employee\":2,\"hidden\":true,\"name\":\"إعادة قيد #2 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR42 allowance R25-2\",\"key\":\"ALLOWANCE:إعادة قيد #2 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR42 allowance R25-2~8507c7ca85b96ae2\",\"net\":9022.22}],\"net\":15033.33,\"reversal\":-15033.33,\"companyAndOwnerFullText\":true,\"storedUnchanged\":true}",
    "{\"case\":\"CR42-context-controls\",\"queryVariants\":5,\"identicalSelfResponses\":true,\"untrustedSerializedPayloadNotParsed\":true,\"storedUnchanged\":true}",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11323.3385"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r42_mixed_test_61ee3d3851faaf80\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r42_mixed_test_61ee3d3851faaf80\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r42_mixed_test_61ee3d3851faaf80\"}\n"
  ]
}
