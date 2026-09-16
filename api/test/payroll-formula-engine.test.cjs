// اختبارات نقية للغة SRS_V1؛ لا قاعدة بيانات أو خادم أو إعدادات حية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { compilePayrollFormula: compile, evaluatePayrollFormula: evaluate, PayrollFormulaError, PAYROLL_FORMULA_LIMITS } = require('../src/payroll/payroll-formula-engine')
const { PayrollDecimal } = require('../src/payroll/payroll-decimal')
const { evalFormula: legacy } = require('../src/payroll/safe-formula')
const defaults = { divisionByZeroMode: 'ZERO_WITH_WARNING', roundingMode: 'HALF_UP', roundingScale: 2 }
function run(text, variables = {}, options = {}, catalog = {}) {
  return evaluate(compile(text, { variables: Object.keys(variables), ...catalog }), { variables }, { ...defaults, ...options })
}
function rejected(action, code) {
  assert.throws(action, error => {
    assert.ok(error instanceof PayrollFormulaError, String(error))
    if (code) assert.equal(error.code, code)
    assert.ok(Number.isInteger(error.position) && error.position >= 1)
    assert.ok(error.message.length > 0)
    return true
  })
}

test('decimal: finite decimal strings and exponent numbers normalize exactly without accepting unsafe integers', () => {
  for (const [input, expected] of [['+000.2900', '0.29'], ['-.500', '-0.5'], ['0', '0'], [1e-7, '0.0000001'], [-1.25e-7, '-0.000000125'], ['999999999999999999999999.123456789', '999999999999999999999999.123456789']]) {
    assert.equal(PayrollDecimal.from(input).canonical(), expected)
  }
  for (const input of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '1e3', ' 1', '', '0x10', '9'.repeat(61)]) {
    assert.throws(() => PayrollDecimal.from(input))
  }
})

test('amount arithmetic preserves exact intermediates and precedences', () => {
  assert.equal(run('0.1 + 0.2').value, '0.30')
  assert.equal(run('(1 / 3) * 3', {}, { roundingScale: 6 }).value, '1.000000')
  assert.equal(run('2 + 3 * 4 - 10 / 5').value, '12.00')
  assert.equal(run('-(-.25 + +.5)').value, '-0.25')
  assert.equal(run('1 / 7', {}, { roundingScale: 6 }).value, '0.142857')
})

test('raw display rounds to six without causing final double rounding or intermediate truncation', () => {
  const result = run('1.2349999')
  assert.equal(result.rawValue, '1.235000')
  assert.equal(result.value, '1.23')
  assert.equal(run('0.00000001 * 100000000', {}, { roundingScale: 6 }).value, '1.000000')
  assert.equal(run('0.004999999999999999999 + 0.000000000000000000001').value, '0.01')
})

test('there is no commercial amount cap and decimal-string inputs retain all provided digits', () => {
  const huge = '999999999999999999999999999999999999999999999999999999999999'
  assert.equal(run('X + .01', { X: huge }).value, huge + '.01')
  assert.equal(run('X * 100000000', { X: '0.000000000123456789' }, { roundingScale: 6 }).value, '0.012346')
})

test('all four rounding modes handle positive/negative ties and avoid negative zero', () => {
  for (const [mode, positive, negative] of [['HALF_UP', '2.35', '-2.35'], ['HALF_EVEN', '2.34', '-2.34'], ['FLOOR', '2.34', '-2.35'], ['CEIL', '2.35', '-2.34']]) {
    assert.equal(run('2.345', {}, { roundingMode: mode }).value, positive)
    assert.equal(run('-2.345', {}, { roundingMode: mode }).value, negative)
    assert.equal(run('-.00001', {}, { roundingMode: mode }).value, mode === 'FLOOR' ? '-0.01' : '0.00')
  }
  assert.equal(run('2.355', {}, { roundingMode: 'HALF_EVEN' }).value, '2.36')
  assert.equal(run('-2.355', {}, { roundingMode: 'HALF_EVEN' }).value, '-2.36')
})

test('whitelisted functions implement MIN/MAX/ABS/ROUND/FLOOR/CEIL/CLAMP', () => {
  assert.equal(run('MIN(9, 3, 7) + MAX(1, 4, 2)').value, '7.00')
  assert.equal(run('ABS(-2.35) + FLOOR(-1.2) + CEIL(1.2)').value, '2.35')
  assert.equal(run('CLAMP(9, 2, 7) + CLAMP(1, 2, 7)').value, '9.00')
  assert.equal(run('ROUND(2.345, 2)', {}, { roundingMode: 'HALF_EVEN', roundingScale: 3 }).value, '2.340')
  assert.equal(run('ROUND(-1.001, 2)', {}, { roundingMode: 'FLOOR' }).value, '-1.01')
  assert.equal(run('ROUND(1.2345, N)', { N: 3 }, { roundingScale: 4 }).value, '1.2350')
})

test('percent is a numeric literal suffix and leaves the legacy remainder contract unchanged', () => {
  assert.equal(run('10% * X', { X: 200 }).value, '20.00')
  assert.equal(run('-12.5% * 80').value, '-10.00')
  for (const text of ['5%2', 'X%', '(10)%', '10%%', '10 % X']) rejected(() => compile(text, { variables: ['X'] }))
  assert.equal(legacy('5%2', {}), 1)
})

test('conditions use strict boolean comparisons with NOT/AND/OR precedence', () => {
  const catalog = { variables: ['X', 'Y'], kind: 'CONDITION' }
  for (const [text, expected] of [['X >= 2 AND NOT Y = 1', true], ['X = 3 OR Y <> 1 AND X < 0', false], ['(X > 1) = (Y > 1)', false], ['X <= 2 AND Y < 2', true]]) {
    const result = evaluate(compile(text, catalog), { variables: { X: 2, Y: 0 } }, defaults)
    assert.equal(result.value, expected); assert.equal(result.rawValue, expected)
  }
})

test('IF chooses numeric or boolean branches with no truthiness coercion', () => {
  assert.equal(run('IF(X > 0, 9, 3)', { X: 0 }).value, '3.00')
  const condition = compile('IF(X > 0, 1 = 1, 1 = 2)', { variables: ['X'], kind: 'CONDITION' })
  assert.equal(evaluate(condition, { variables: { X: 2 } }, defaults).value, true)
  for (const text of ['IF(1,2,3)', '1 + (1=1)', 'MIN(1=1, 2)', '1 AND 2', '1 = (1=1)', '(1=1) < (2=2)', 'IF(1=1,1,2=2)']) rejected(() => compile(text, { variables: [] }), 'TYPE_MISMATCH')
  rejected(() => compile('1=1', { variables: [] }), 'TYPE_MISMATCH')
  rejected(() => compile('1', { variables: [], kind: 'CONDITION' }), 'TYPE_MISMATCH')
})

test('IF and boolean short-circuiting skip zero divisors, missing inputs, and invalid values in unselected branches', () => {
  for (const divisionByZeroMode of ['ZERO_WITH_WARNING', 'FAIL_ROW']) {
    const compiled = compile('IF(X > 0, 10, BAD / ZERO + MISSING)', { variables: ['X', 'BAD', 'ZERO', 'MISSING'] })
    const result = evaluate(compiled, { variables: { X: 1, BAD: 'invalid', ZERO: 0 } }, { ...defaults, divisionByZeroMode })
    assert.equal(result.value, '10.00'); assert.deepEqual(result.warnings, []); assert.deepEqual(result.inputs, { X: '1' })
    for (const text of ['1=1 OR (BAD/ZERO > 0)', '1=2 AND (BAD/ZERO > 0)']) {
      const condition = compile(text, { variables: ['BAD', 'ZERO'], kind: 'CONDITION' })
      assert.deepEqual(evaluate(condition, { variables: { BAD: 'invalid', ZERO: 0 } }, { ...defaults, divisionByZeroMode }).warnings, [])
    }
  }
})

test('constant zero divisors, including compound expressions and dead branches, reject at compile time', () => {
  for (const text of ['X / 0', 'X / (1 - 1)', 'X / (0.1 + 0.2 - 0.3)', 'X / (1/3*3-1)', 'IF(1=1,2,X/0)', 'X / MIN(0,1)', 'X / IF(1=1,0,2)']) {
    rejected(() => compile(text, { variables: ['X'] }), 'CONSTANT_DIVISION_BY_ZERO')
  }
  assert.equal(run('IF(1=1, 2, X / Y)', { X: 0, Y: 0 }, { divisionByZeroMode: 'FAIL_ROW' }).value, '2.00')
})

test('constant ROUND folding uses the actual policy mode and syntax-only compilation does not invent one', () => {
  const formula = 'X / ROUND(.5,0)', syntaxOnly = compile(formula, { variables: ['X'] })
  assert.equal(syntaxOnly.roundingMode, undefined)
  const valid = compile(formula, { variables: ['X'], roundingMode: 'HALF_UP' })
  assert.equal(valid.roundingMode, 'HALF_UP')
  assert.equal(evaluate(syntaxOnly, { variables: { X: 2 } }, defaults).value, '2.00')
  assert.equal(evaluate(valid, { variables: { X: 2 } }, defaults).value, '2.00')
  for (const roundingMode of ['FLOOR', 'HALF_EVEN']) {
    rejected(() => compile(formula, { variables: ['X'], roundingMode }), 'CONSTANT_DIVISION_BY_ZERO')
    rejected(() => evaluate(valid, { variables: { X: 2 } }, { ...defaults, roundingMode }), 'CONSTANT_DIVISION_BY_ZERO')
  }
  rejected(() => compile('X / ROUND(0,0)', { variables: ['X'] }), 'CONSTANT_DIVISION_BY_ZERO')
  rejected(() => compile('X / (ROUND(.5,0)-1)', { variables: ['X'], roundingMode: 'HALF_UP' }), 'CONSTANT_DIVISION_BY_ZERO')
  assert.equal(evaluate(compile('X / (ROUND(.5,0)-1)', { variables: ['X'] }), { variables: { X: 2 } }, { ...defaults, roundingMode: 'FLOOR' }).value, '-2.00')
})

test('variable division by zero produces an auditable warning or FAIL_ROW error at the operator', () => {
  const compiled = compile('12 / X + 5', { variables: ['X'] })
  const result = evaluate(compiled, { variables: { X: 0 } }, defaults)
  assert.equal(result.value, '5.00')
  assert.deepEqual(result.warnings.map(({ code, position, expression }) => ({ code, position, expression })), [{ code: 'DIVISION_BY_ZERO', position: 4, expression: '12 / X + 5' }])
  rejected(() => evaluate(compiled, { variables: { X: 0 } }, { ...defaults, divisionByZeroMode: 'FAIL_ROW' }), 'DIVISION_BY_ZERO')
})

test('missing and null numeric references use own properties only, normalize zero, and warn once per reference', () => {
  const compiled = compile('X + X + Y', { variables: ['X', 'Y'] })
  const inherited = Object.create({ X: 999 }); inherited.Y = null
  const result = evaluate(compiled, { variables: inherited }, defaults)
  assert.equal(result.value, '0.00')
  assert.deepEqual(result.inputs, { X: '0', Y: '0' })
  assert.deepEqual(result.warnings.map(warning => warning.reference), ['X', 'Y'])
  assert.equal(result.substitutedExpression, '(0) + (0) + (0)')
})

test('provided invalid numeric values and accessors reject rather than coerce or execute code', () => {
  const compiled = compile('X', { variables: ['X'] })
  for (const value of [NaN, Infinity, -Infinity, 'NaN', '', ' 2 ', 'Infinity', 'true', '1e3', '0x10', {}, [], true, Number.MAX_SAFE_INTEGER + 1, '1'.repeat(61)]) {
    rejected(() => evaluate(compiled, { variables: { X: value } }, defaults), 'INPUT_INVALID')
  }
  let invoked = false
  const variables = Object.defineProperty({}, 'X', { get() { invoked = true; return 8 } })
  rejected(() => evaluate(compiled, { variables }, defaults), 'INPUT_INVALID')
  const input = Object.defineProperty({}, 'variables', { get() { invoked = true; return {} } })
  rejected(() => evaluate(compiled, input, defaults), 'INPUT_INVALID')
  assert.equal(invoked, false)
})

test('typed references are catalogued separately and substitution preserves their source spans', () => {
  const compiled = compile('X + COMP[PHONE] * PARAM[FACTOR] - TYPED_DEDUCTION[QUALITY] + X', {
    variables: ['X'], components: ['PHONE'], parameters: ['FACTOR'], typedDeductions: ['QUALITY'],
  })
  assert.deepEqual(compiled.references, { variables: ['X'], components: ['PHONE'], parameters: ['FACTOR'], typedDeductions: ['QUALITY'] })
  const result = evaluate(JSON.parse(JSON.stringify(compiled)), { variables: { X: '1.2' }, components: { PHONE: '10' }, parameters: { FACTOR: '0.5' }, typedDeductions: { QUALITY: '2' } }, defaults)
  assert.equal(result.value, '5.40')
  assert.deepEqual(result.inputs, { X: '1.2', 'COMP[PHONE]': '10', 'PARAM[FACTOR]': '0.5', 'TYPED_DEDUCTION[QUALITY]': '2' })
  assert.equal(result.substitutedExpression, '(1.2) + (10) * (0.5) - (2) + (1.2)')
  rejected(() => compile('DEDUCT[QUALITY]', { variables: [], typedDeductions: ['QUALITY'] }), 'REFERENCE_INVALID')
})

test('unknown identifiers and references reject even in unreachable branches', () => {
  for (let index = 0; index < 10; index++) {
    rejected(() => compile(`IF(1=1, 0, UNKNOWN_${index})`, { variables: [] }), 'REFERENCE_UNKNOWN')
  }
  for (const text of ['COMP[UNKNOWN]', 'PARAM[UNKNOWN]', 'TYPED_DEDUCTION[UNKNOWN]']) rejected(() => compile(text, { variables: [] }), 'REFERENCE_UNKNOWN')
})

test('catalog names are closed uppercase identifiers and may not collide across kinds or with language words', () => {
  for (const name of ['toString', 'constructor', '__proto__', 'X.Y', 'X[Y]', '1ABC', 'IF', 'COMP', 'AND', 'MAX', 'TYPED_DEDUCTION']) {
    rejected(() => compile('1', { variables: [name] }), 'IDENTIFIER_INVALID')
  }
  rejected(() => compile('1', { variables: ['X', 'X'] }), 'IDENTIFIER_COLLISION')
  for (const group of ['components', 'parameters', 'typedDeductions']) rejected(() => compile('1', { variables: ['X'], [group]: ['X'] }), 'IDENTIFIER_COLLISION')
  rejected(() => compile('1', { variables: ['Y'], components: ['X'], parameters: ['X'] }), 'IDENTIFIER_COLLISION')
})

test('typed deduction codes may share a component or parameter code while each namespace remains closed', () => {
  const compiled = compile('COMP[QUALITY] + TYPED_DEDUCTION[QUALITY]', { variables: [], components: ['QUALITY'], typedDeductions: ['QUALITY'] })
  assert.equal(evaluate(compiled, { components: { QUALITY: 2 }, typedDeductions: { QUALITY: 3 } }, defaults).value, '5.00')
  const parameter = compile('PARAM[QUALITY] + TYPED_DEDUCTION[QUALITY]', { variables: [], parameters: ['QUALITY'], typedDeductions: ['QUALITY'] })
  assert.equal(evaluate(parameter, { parameters: { QUALITY: 4 }, typedDeductions: { QUALITY: 3 } }, defaults).value, '7.00')
  rejected(() => compile('1', { variables: [], typedDeductions: ['QUALITY', 'QUALITY'] }), 'IDENTIFIER_COLLISION')
})

test('unlisted functions, bad arities, invalid ROUND scales and CLAMP bounds reject statically', () => {
  for (const text of ['SQRT(4)', 'eval(1)', 'CONSTRUCTOR(1)', 'min(1,2)']) rejected(() => compile(text, { variables: [] }), 'FUNCTION_UNKNOWN')
  for (const text of ['MIN()', 'MIN(1)', 'MAX(1)', 'ABS(1,2)', 'ROUND(1)', 'ROUND(1,2,3)', 'FLOOR()', 'CEIL(1,2)', 'CLAMP(1,2)', 'IF(1=1,2)']) rejected(() => compile(text, { variables: [] }), 'ARITY_INVALID')
  for (const text of ['ROUND(X,-1)', 'ROUND(X,7)', 'ROUND(X,1.5)', 'IF(1=1,2,ROUND(X,1.5))']) rejected(() => compile(text, { variables: ['X'] }), 'ROUND_SCALE_INVALID')
  rejected(() => compile('CLAMP(X,2,1)', { variables: ['X'] }), 'CLAMP_BOUNDS_INVALID')
})

test('dynamic ROUND scales and CLAMP bounds validate only on the selected execution path', () => {
  for (const value of [-1, 7, 1.5]) rejected(() => run('ROUND(2,X)', { X: value }), 'ROUND_SCALE_INVALID')
  rejected(() => run('CLAMP(2,X,Y)', { X: 3, Y: 1 }), 'CLAMP_BOUNDS_INVALID')
  assert.equal(run('IF(1=1,2,ROUND(2,X))', { X: 7 }).value, '2.00')
})

test('property access, strings, assignment, comments and code-like payloads never enter evaluation', () => {
  for (const text of ['X.constructor', 'process.env', 'globalThis', 'require("fs")', 'X=1;X', 'X[0]', 'COMP[X.Y]', 'PARAM["X"]', 'X++', 'X/*a*/2', '//test', 'Math.max(1,2)', '`test`', '({})', '(()=>1)()', '1 ** 2', '1 % 2']) {
    rejected(() => compile(text, { variables: ['X'] }))
  }
})

test('compile error positions are one-based and point to the offending source token', () => {
  assert.throws(() => compile('X + UNKNOWN', { variables: ['X'] }), error => error.code === 'REFERENCE_UNKNOWN' && error.position === 5)
  assert.throws(() => compile('1 + @', { variables: [] }), error => error.code === 'TOKEN_INVALID' && error.position === 5)
  assert.throws(() => compile('1 + ', { variables: [] }), error => error.position === 5)
})

test('text/token/nesting boundaries are exact and unary/function nesting is also bounded', () => {
  assert.equal(run('1' + ' '.repeat(499)).value, '1.00')
  rejected(() => compile('1' + ' '.repeat(500), { variables: [] }), 'TEXT_LIMIT')
  assert.equal(run('('.repeat(10) + '1' + ')'.repeat(10)).value, '1.00')
  rejected(() => compile('('.repeat(11) + '1' + ')'.repeat(11), { variables: [] }), 'NESTING_LIMIT')
  assert.equal(run('-'.repeat(10) + '1').value, '1.00')
  rejected(() => compile('-'.repeat(11) + '1', { variables: [] }), 'NESTING_LIMIT')
  rejected(() => compile('ABS('.repeat(11) + '1' + ')'.repeat(11), { variables: [] }), 'NESTING_LIMIT')
  assert.equal(run('-' + Array(100).fill('1').join('+')).value, '98.00')
  rejected(() => compile(Array(101).fill('1').join('+'), { variables: [] }), 'TOKEN_LIMIT')
})

test('resource bounds are deterministic and exposed without a wall-clock or external dependency', () => {
  assert.deepEqual(PAYROLL_FORMULA_LIMITS, { characters: 500, tokens: 200, nesting: 10, evaluationSteps: 10000, inputCharacters: 80, inputDigits: 60, intermediateBits: 4096 })
  const compiled = compile(Array(30).fill('X').join('*'), { variables: ['X'] })
  rejected(() => evaluate(compiled, { variables: { X: '9'.repeat(60) } }, defaults), 'NUMERIC_LIMIT')
  const variables = Object.fromEntries(Array.from({ length: 80 }, (_, index) => [`X${index}`, '0.' + '0'.repeat(58) + '1']))
  const expensive = compile(Object.keys(variables).join('+'), { variables: Object.keys(variables) })
  rejected(() => evaluate(expensive, { variables }, defaults), 'EVALUATION_LIMIT')
})

test('evaluation validates its contract/options and reparses JSON-safe source instead of executing a forged AST', () => {
  const compiled = compile('1+2', { variables: [] })
  compiled.ast = { tag: 'CALL', name: 'require', arguments: [] }
  assert.equal(evaluate(compiled, {}, defaults).value, '3.00')
  compiled.ast = compiled
  assert.equal(evaluate(compiled, {}, defaults).value, '3.00')
  rejected(() => evaluate({ ...compiled, contractVersion: 'LEGACY_V1' }, {}, defaults), 'CONTRACT_INVALID')
  for (const options of [{ roundingMode: 'HALF_DOWN' }, { roundingScale: 7 }, { roundingScale: 0.1 }, { divisionByZeroMode: 'IGNORE' }]) {
    rejected(() => evaluate(compiled, {}, { ...defaults, ...options }), 'OPTIONS_INVALID')
  }
})

test('same compiled expression and inputs repeat one thousand times with byte-identical results and untouched caller data', () => {
  const compiled = compile('IF(X > 0, MIN(X * 10%, PARAM[CAP]) + 1/3*3, MISSING)', { variables: ['X', 'MISSING'], parameters: ['CAP'] })
  const inputs = { variables: { X: '1234.56' }, parameters: { CAP: '100' } }
  const before = JSON.stringify({ compiled, inputs }), result = JSON.stringify(evaluate(compiled, inputs, defaults))
  for (let index = 0; index < 1000; index++) assert.equal(JSON.stringify(evaluate(compiled, inputs, defaults)), result)
  assert.equal(JSON.stringify({ compiled, inputs }), before)
})
