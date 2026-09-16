// انقطاع الاتصال يوصل ApiError(0): إصدار المستند لازم يفضل مقفول على نفس محاولة الإصدار (نفس المفتاح) عشان ميتكررش
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { module: 'commonjs', moduleResolution: 'node' } })
const api = require('../../src/lib/api')
const root = path.resolve(__dirname, '..', '..')

test('a dropped connection becomes ApiError with status 0 and an Arabic message; an abort is passed through', async () => {
  const realFetch = global.fetch
  try {
    global.fetch = async () => { throw new TypeError('Failed to fetch') }
    const err = await api.apiFetch('/hr-documents/issue', { method: 'POST', body: '{}' }).catch(e => e)
    assert.ok(err instanceof api.ApiError)
    assert.equal(err.status, api.NETWORK_ERROR_STATUS)
    assert.equal(err.status, 0)
    assert.match(err.message, /تعذر الاتصال بالخادم/)
    const abort = new DOMException('aborted', 'AbortError')
    global.fetch = async () => { throw abort }
    assert.equal(await api.apiFetch('/x').catch(e => e), abort)
  } finally { global.fetch = realFetch }
})

test('network, timeout, server and non-API errors are uncertain saves; client errors are not', () => {
  const { ApiError, isUncertainWriteError } = api
  for (const err of [new ApiError(0, 'انقطاع'), new ApiError(408, 'مهلة'), new ApiError(500, 'خادم'), new ApiError(503, 'خادم'),
    new TypeError('Failed to fetch'), new SyntaxError('bad json'), new DOMException('aborted', 'AbortError')]) {
    assert.equal(isUncertainWriteError(err), true, `${err.constructor.name} ${err.status ?? ''}`)
  }
  for (const status of [400, 401, 403, 404, 409, 413, 422, 429]) assert.equal(isUncertainWriteError(new ApiError(status, 'x')), false, String(status))
})

test('document issue page keeps the retry lock for any uncertain error, including status 0', () => {
  const page = fs.readFileSync(path.join(root, 'src/app/employees/documents/create/page.tsx'), 'utf8')
  assert.match(page, /if \(isUncertainWriteError\(err\)\) setUncertain\(currentAttempt\)\s*\n\s*else setUncertain\(null\)/)
  assert.doesNotMatch(page, /!\(err instanceof ApiError\) \|\| err\.status >= 500/)
  // القفل: المدخلات مقفولة وتحذير مغادرة الصفحة طول ما المحاولة مش مؤكدة
  assert.match(page, /const inputsDisabled = !!operation \|\| !!uncertain/)
  assert.match(page, /if \(!uncertain\) return\s*\n\s*const handler = \(event: BeforeUnloadEvent\)/)
})
