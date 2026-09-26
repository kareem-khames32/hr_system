module.exports = {
  "selected": [
    "codex-review-round10-login"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 5,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 8266.8746
  },
  "results": [
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 login handlers preserve password, remembered session and forced password-change redirect",
      "ms": 87.4371,
      "pass": false,
      "error": "(0 , clsx_1.default) is not a function",
      "cause": "(0 , clsx_1.default) is not a function",
      "stack": "TypeError: (0 , clsx_1.default) is not a function\n    at Object.LoginPage [as default] (page.tsx:166:79)\n    at render (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:33:50)\n    at page (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:40:3)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:43:11)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 login handlers preserve domain switching and clear the old password",
      "ms": 99.912,
      "pass": false,
      "error": "(0 , clsx_1.default) is not a function",
      "cause": "(0 , clsx_1.default) is not a function",
      "stack": "TypeError: (0 , clsx_1.default) is not a function\n    at Object.LoginPage [as default] (page.tsx:166:79)\n    at render (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:33:50)\n    at page (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:40:3)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:49:11)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n    at Test.postRun (node:internal/test_runner/test:1235:19)\n    at Test.run (node:internal/test_runner/test:1163:12)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 two-factor handlers withhold the session, filter the code, recover from a wrong code and allow resend then verification",
      "ms": 55.6034,
      "pass": false,
      "error": "(0 , clsx_1.default) is not a function",
      "cause": "(0 , clsx_1.default) is not a function",
      "stack": "TypeError: (0 , clsx_1.default) is not a function\n    at Object.LoginPage [as default] (page.tsx:166:79)\n    at render (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:33:50)\n    at page (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:40:3)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:56:11)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n    at Test.postRun (node:internal/test_runner/test:1235:19)\n    at Test.run (node:internal/test_runner/test:1163:12)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 change-password handlers validate confirmation and retain session persistence after success",
      "ms": 25.1141,
      "pass": false,
      "error": "Maximum call stack size exceeded",
      "cause": "Maximum call stack size exceeded",
      "stack": "RangeError: Maximum call stack size exceeded\n    at Array.isArray (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:42)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:56)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 expired session during password change clears it and returns to expired-login state",
      "ms": 24.1905,
      "pass": false,
      "error": "Maximum call stack size exceeded",
      "cause": "Maximum call stack size exceeded",
      "stack": "RangeError: Maximum call stack size exceeded\n    at Array.push (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:123)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:56)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 login handlers preserve password, remembered session and forced password-change redirect",
      "ms": 87.4371,
      "pass": false,
      "error": "(0 , clsx_1.default) is not a function",
      "cause": "(0 , clsx_1.default) is not a function",
      "stack": "TypeError: (0 , clsx_1.default) is not a function\n    at Object.LoginPage [as default] (page.tsx:166:79)\n    at render (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:33:50)\n    at page (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:40:3)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:43:11)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 login handlers preserve domain switching and clear the old password",
      "ms": 99.912,
      "pass": false,
      "error": "(0 , clsx_1.default) is not a function",
      "cause": "(0 , clsx_1.default) is not a function",
      "stack": "TypeError: (0 , clsx_1.default) is not a function\n    at Object.LoginPage [as default] (page.tsx:166:79)\n    at render (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:33:50)\n    at page (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:40:3)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:49:11)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n    at Test.postRun (node:internal/test_runner/test:1235:19)\n    at Test.run (node:internal/test_runner/test:1163:12)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 two-factor handlers withhold the session, filter the code, recover from a wrong code and allow resend then verification",
      "ms": 55.6034,
      "pass": false,
      "error": "(0 , clsx_1.default) is not a function",
      "cause": "(0 , clsx_1.default) is not a function",
      "stack": "TypeError: (0 , clsx_1.default) is not a function\n    at Object.LoginPage [as default] (page.tsx:166:79)\n    at render (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:33:50)\n    at page (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:40:3)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:56:11)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n    at Test.postRun (node:internal/test_runner/test:1235:19)\n    at Test.run (node:internal/test_runner/test:1163:12)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 change-password handlers validate confirmation and retain session persistence after success",
      "ms": 25.1141,
      "pass": false,
      "error": "Maximum call stack size exceeded",
      "cause": "Maximum call stack size exceeded",
      "stack": "RangeError: Maximum call stack size exceeded\n    at Array.isArray (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:42)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:56)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)"
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 expired session during password change clears it and returns to expired-login state",
      "ms": 24.1905,
      "pass": false,
      "error": "Maximum call stack size exceeded",
      "cause": "Maximum call stack size exceeded",
      "stack": "RangeError: Maximum call stack size exceeded\n    at Array.push (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:123)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:56)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at nodes (D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:131)\n    at D:\\projects\\hr_system\\api\\test\\codex-review-round10-login.integration.cjs:34:67\n    at Array.forEach (<anonymous>)"
    }
  ],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 0",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8266.8746"
  ],
  "stdout": []
}
