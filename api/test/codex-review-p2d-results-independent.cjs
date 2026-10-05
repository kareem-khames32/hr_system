module.exports = {
  "selected": [
    "codex-review-p2d-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 8748.9635
  },
  "results": [
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D independent regular OLE chains: 512/4096 sectors, physical permutation, exact last byte",
      "ms": 5538.3485,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D mini streams: chained data crosses root sectors, later link loss is refused",
      "ms": 2.4113,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D declared classification limit: root signature required; remaining body is not a document validator",
      "ms": 4.0318,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D XML metadata: namespace aliases and character references cannot hide duplicate definitions",
      "ms": 1.6823,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D OOXML main type is relationship plus namespace, independent of path and compression",
      "ms": 6.6585,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D ZIP missing main bytes and encrypted main parts cannot upload as Office",
      "ms": 0.8252,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2d-independent.integration.cjs",
      "name": "P2D actual upload boundary: rejected containers create no row; accepted bytes/hash are unchanged",
      "ms": 175.6173,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"independent-regular-chain-matrix\",\"accepted\":24,\"rejected\":36}",
    "{\"case\":\"mini-stream-boundaries\",\"acceptedSizes\":[2,63,64,65,511,512,513,1025,4095]}",
    "{\"case\":\"independent-http-boundary\",\"rejected\":400,\"accepted\":201,\"hashUnchanged\":true,\"noRejectedRow\":true}",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8748.9635"
  ],
  "stdout": [
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2d_independent_test_52eb48e5738dff1c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2d_independent_test_52eb48e5738dff1c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2d_independent_test_52eb48e5738dff1c\"}\n"
  ]
}
