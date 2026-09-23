module.exports = {
  "selected": [
    "codex-review-round2-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 2,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 33170.2476
  },
  "results": [
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02A bulk pay must preserve the payment method used immediately before payment",
      "ms": 17330.5772,
      "pass": false,
      "error": "Payment flips the bank sheet back to calculation-time cash\n+ actual - expected\n\n  [\n+   0,\n    1000,\n-   0\n  ]\n",
      "cause": "Payment flips the bank sheet back to calculation-time cash\n+ actual - expected\n\n  [\n+   0,\n    1000,\n-   0\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Payment flips the bank sheet back to calculation-time cash\n+ actual - expected\n\n  [\n+   0,\n    1000,\n-   0\n  ]\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round2-independent.integration.cjs:39:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02B bulk mixed payment must freeze its bank/cash amounts after payment",
      "ms": 13285.542,
      "pass": false,
      "error": "Paid mixed split is still derived from the live employee bank amount\n+ actual - expected\n\n  [\n+   800,\n+   200\n-   300,\n-   700\n  ]\n",
      "cause": "Paid mixed split is still derived from the live employee bank amount\n+ actual - expected\n\n  [\n+   800,\n+   200\n-   300,\n-   700\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Paid mixed split is still derived from the live employee bank amount\n+ actual - expected\n\n  [\n+   800,\n+   200\n-   300,\n-   700\n  ]\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round2-independent.integration.cjs:49:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N01 self and branch users cannot enumerate foreign/missing monthly or working-day records",
      "ms": 458.8393,
      "pass": true
    }
  ],
  "failures": [
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02A bulk pay must preserve the payment method used immediately before payment",
      "ms": 17330.5772,
      "pass": false,
      "error": "Payment flips the bank sheet back to calculation-time cash\n+ actual - expected\n\n  [\n+   0,\n    1000,\n-   0\n  ]\n",
      "cause": "Payment flips the bank sheet back to calculation-time cash\n+ actual - expected\n\n  [\n+   0,\n    1000,\n-   0\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Payment flips the bank sheet back to calculation-time cash\n+ actual - expected\n\n  [\n+   0,\n    1000,\n-   0\n  ]\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round2-independent.integration.cjs:39:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02B bulk mixed payment must freeze its bank/cash amounts after payment",
      "ms": 13285.542,
      "pass": false,
      "error": "Paid mixed split is still derived from the live employee bank amount\n+ actual - expected\n\n  [\n+   800,\n+   200\n-   300,\n-   700\n  ]\n",
      "cause": "Paid mixed split is still derived from the live employee bank amount\n+ actual - expected\n\n  [\n+   800,\n+   200\n-   300,\n-   700\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Paid mixed split is still derived from the live employee bank amount\n+ actual - expected\n\n  [\n+   800,\n+   200\n-   300,\n-   700\n  ]\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round2-independent.integration.cjs:49:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"scenario\":\"bulk method changed before payment\",\"beforePay\":{\"bank\":[1000,0],\"screen\":[1000,0],\"financial\":[1000,0],\"state\":\"UNPAID\"},\"afterPay\":{\"bank\":[0,1000],\"screen\":[0,1000],\"financial\":[0,1000],\"state\":\"PAID\"},\"marks\":0}",
    "{\"scenario\":\"mixed amount changed after payment\",\"beforeChange\":{\"bank\":[300,700],\"screen\":[300,700],\"financial\":[300,700],\"state\":\"PAID\"},\"afterChange\":{\"bank\":[800,200],\"screen\":[800,200],\"financial\":[800,200],\"state\":\"PAID\"}}",
    "{\"scenario\":\"no employee enumeration\",\"statuses\":[400,403,400,403]}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 33170.2476"
  ]
}
