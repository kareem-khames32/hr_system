module.exports = {
  "selected": [
    "codex-review-p2a-documents"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 10276.0007
  },
  "results": [
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "HR template permissions and validation prevent forged variables and null patches without changing letters",
      "ms": 6508.4953,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "draft edits do not change publication, and stale versions cannot overwrite a template",
      "ms": 101.3327,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "sample preview is a real PDF and neither it nor employee preview creates records",
      "ms": 73.9126,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "employee and custom fields are required only when referenced, with branch isolation before issuance",
      "ms": 89.9166,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "issuance archives a PDF in employee documents and concurrent retries issue it only once",
      "ms": 155.026,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "a saved document keeps its bytes after template and employee changes; an idempotent retry returns that issuance",
      "ms": 128.6577,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "financial tokens and both PDF download paths enforce finance permission and current branch",
      "ms": 158.4186,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "a general company document needs no employee and remains visible only in its branch scope",
      "ms": 114.152,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "a database failure after PDF creation leaves no files or partial records and the same key can retry",
      "ms": 111.611,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2a-documents.integration.cjs",
      "name": "P2A every generated archived document stores the SHA256 of its actual bytes",
      "ms": 6.0435,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10276.0007"
  ],
  "stdout": [
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_documents_test_4aeaf630360f7759\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_documents_test_4aeaf630360f7759\"}\n"
  ]
}
