import { PayrollDecimal, PayrollDecimalError, PAYROLL_DECIMAL_LIMITS, PayrollRoundingMode } from './payroll-decimal'

export const PAYROLL_FORMULA_ENGINE_VERSION = 'SRS_FORMULA_V1_20260913' as const

export const PAYROLL_FORMULA_LIMITS = Object.freeze({ characters: 500, tokens: 200, nesting: 10, evaluationSteps: 10000, ...PAYROLL_DECIMAL_LIMITS })
export class PayrollFormulaError extends Error {
  constructor(readonly code: string, message: string, readonly position: number) { super(message); this.name = 'PayrollFormulaError' }
}
type Group = 'variables' | 'components' | 'parameters' | 'typedDeductions'
type Kind = 'AMOUNT' | 'CONDITION'
type ValueType = 'NUMBER' | 'BOOLEAN'
type FunctionName = 'MIN' | 'MAX' | 'ABS' | 'ROUND' | 'FLOOR' | 'CEIL' | 'CLAMP' | 'IF'
interface NodeBase { position: number; end: number; valueType: ValueType }
export type PayrollFormulaNode = NodeBase & (
  { tag: 'NUMBER'; text: string; percent: boolean } |
  { tag: 'REFERENCE'; group: Group; name: string; label: string } |
  { tag: 'UNARY'; operator: '+' | '-' | 'NOT'; operand: PayrollFormulaNode } |
  { tag: 'BINARY'; operator: string; left: PayrollFormulaNode; right: PayrollFormulaNode } |
  { tag: 'CALL'; name: FunctionName; arguments: PayrollFormulaNode[] }
)
export interface PayrollFormulaCompileOptions { variables: string[]; components?: string[]; parameters?: string[]; typedDeductions?: string[]; kind?: Kind; roundingMode?: PayrollRoundingMode }
export interface CompiledPayrollFormula {
  contractVersion: 'SRS_V1'; source: string; kind: Kind; ast: PayrollFormulaNode; roundingMode?: PayrollRoundingMode
  catalog: Record<Group, string[]>; references: Record<Group, string[]>
}
export interface PayrollFormulaInputs {
  variables?: Record<string, string | number | null>; components?: Record<string, string | number | null>
  parameters?: Record<string, string | number | null>; typedDeductions?: Record<string, string | number | null>
}
// مدخل داخلي للمحركات المركبة؛ تبقى واجهة JSON العامة مقصورة على الأعداد والنصوص.
export type PayrollExactFormulaMap = Readonly<Record<string, PayrollDecimal | string | number | null>>
export interface PayrollExactFormulaInputs {
  variables?: PayrollExactFormulaMap; components?: PayrollExactFormulaMap
  parameters?: PayrollExactFormulaMap; typedDeductions?: PayrollExactFormulaMap
}
export interface PayrollExactFormulaEvaluationOptions {
  divisionByZeroMode: 'ZERO_WITH_WARNING' | 'FAIL_ROW'; roundingMode: PayrollRoundingMode
  /** ميزانية إضافية للطلب المركب؛ لا تلغي ميزانية المعادلة الفردية. */
  spend?: () => void
}
export interface PayrollExactFormulaResult {
  exactValue: PayrollDecimal | boolean; warnings: PayrollFormulaWarning[]
  inputs: Record<string, string>; substitutedExpression: string
  /** مراجع الفرع العددي المنفذ؛ تظل مراجع شروط الاختيار ضمن inputs للتدقيق فقط. */
  valueReferences: string[]
}
export interface PayrollFormulaEvaluationOptions { divisionByZeroMode: 'ZERO_WITH_WARNING' | 'FAIL_ROW'; roundingMode: PayrollRoundingMode; roundingScale: number }
export interface PayrollFormulaWarning { code: 'MISSING_INPUT' | 'DIVISION_BY_ZERO' | 'ATTENDANCE_EXEMPT'; message: string; position: number; reference?: string; expression?: string }
const groups: Group[] = ['variables', 'components', 'parameters', 'typedDeductions']
const roundingModes: PayrollRoundingMode[] = ['HALF_UP', 'HALF_EVEN', 'FLOOR', 'CEIL', 'DOWN']
const functions = new Set<FunctionName>(['MIN', 'MAX', 'ABS', 'ROUND', 'FLOOR', 'CEIL', 'CLAMP', 'IF'])
const prefixes = new Map<string, Group>([['COMP', 'components'], ['PARAM', 'parameters'], ['TYPED_DEDUCTION', 'typedDeductions']])
const reserved = new Set<string>([...functions, ...prefixes.keys(), 'AND', 'OR', 'NOT'])
const own = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key)
function fail(code: string, message: string, position: number): never { throw new PayrollFormulaError(code, message, position) }

class Budget {
  position = 1
  private remaining = PAYROLL_FORMULA_LIMITS.evaluationSteps
  constructor(private readonly parentSpend?: () => void) {}
  spend = () => {
    if (--this.remaining < 0) fail('EVALUATION_LIMIT', 'تجاوزت المعادلة ميزانية التعقيد المسموح بها', this.position)
    this.parentSpend?.()
  }
  at<T>(position: number, action: () => T): T {
    const previous = this.position
    this.position = position
    try { return action() } catch (error) {
      if (error instanceof PayrollDecimalError) fail(error.code, error.message, position)
      throw error
    } finally { this.position = previous }
  }
}
interface Token { type: 'NUMBER' | 'IDENTIFIER' | 'SYMBOL' | 'END'; text: string; position: number; end: number }
function tokenize(text: string) {
  if (typeof text !== 'string' || !text.trim()) fail('FORMULA_EMPTY', 'اكتب معادلة غير فارغة', 1)
  if (text.length > PAYROLL_FORMULA_LIMITS.characters) fail('TEXT_LIMIT', 'المعادلة تتجاوز 500 محرف', 501)
  const tokens: Token[] = []
  let cursor = 0
  while (cursor < text.length) {
    if (/\s/.test(text[cursor])) { cursor++; continue }
    const start = cursor, rest = text.slice(cursor)
    let match: RegExpExecArray | null
    let type: Token['type'], value: string
    if ((match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(rest))) { type = 'NUMBER'; value = match[0] }
    else if ((match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { type = 'IDENTIFIER'; value = match[0] }
    else if ((match = /^(?:<>|<=|>=|[+\-*/%()\[\],=<>])/.exec(rest))) { type = 'SYMBOL'; value = match[0] }
    else fail('TOKEN_INVALID', `رمز غير مسموح: ${text[cursor]}`, cursor + 1)
    cursor += value.length; tokens.push({ type, text: value, position: start + 1, end: cursor })
    if (tokens.length > PAYROLL_FORMULA_LIMITS.tokens) fail('TOKEN_LIMIT', 'المعادلة تتجاوز 200 رمز', start + 1)
  }
  tokens.push({ type: 'END', text: '', position: text.length + 1, end: text.length })
  return tokens
}
function catalogOf(options: PayrollFormulaCompileOptions) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('CATALOG_INVALID', 'كتالوج المتغيرات مطلوب', 1)
  const catalog = {} as Record<Group, string[]>
  for (const group of groups) {
    const values = own(options, group) ? options[group] : group === 'variables' ? undefined : []
    if (!Array.isArray(values)) fail('CATALOG_INVALID', `كتالوج ${group} يجب أن يكون قائمة أسماء`, 1)
    catalog[group] = []; const seen = new Set<string>()
    for (const name of values) {
      if (typeof name !== 'string' || !/^[A-Z][A-Z0-9_]{0,59}$/.test(name) || reserved.has(name)) fail('IDENTIFIER_INVALID', `اسم محجوز أو غير صالح في الكتالوج: ${String(name)}`, 1)
      if (seen.has(name) || (group !== 'variables' && catalog.variables.includes(name)) || (group === 'parameters' && catalog.components.includes(name))) {
        fail('IDENTIFIER_COLLISION', `اسم مكرر أو محجوز بين مدخلات الكتالوج: ${name}`, 1)
      }
      seen.add(name); catalog[group].push(name)
    }
  }
  return catalog
}

class Parser {
  private cursor = 0
  private depth = 0
  private readonly known: Record<Group, Set<string>>
  readonly references: Record<Group, string[]> = { variables: [], components: [], parameters: [], typedDeductions: [] }
  constructor(private readonly tokens: Token[], catalog: Record<Group, string[]>) {
    this.known = Object.fromEntries(groups.map(group => [group, new Set(catalog[group])])) as Record<Group, Set<string>>
  }
  private peek() { return this.tokens[this.cursor] }
  private next() { return this.tokens[this.cursor++] }
  private take(text: string) { if (this.peek().text !== text) return false; this.next(); return true }
  private expect(text: string) { const token = this.peek(); if (!this.take(text)) fail('SYNTAX_ERROR', `متوقع ${text}`, token.position); return token }
  private nested<T>(position: number, action: () => T) {
    if (++this.depth > PAYROLL_FORMULA_LIMITS.nesting) fail('NESTING_LIMIT', 'التعشيش يتجاوز 10 مستويات', position)
    try { return action() } finally { this.depth-- }
  }
  private require(node: PayrollFormulaNode, valueType: ValueType, position = node.position) {
    if (node.valueType !== valueType) fail('TYPE_MISMATCH', valueType === 'NUMBER' ? 'هذا الموضع يحتاج قيمة رقمية' : 'الشرط يحتاج مقارنة منطقية صريحة', position)
  }
  parse(kind: Kind) {
    const node = this.or()
    if (this.peek().type !== 'END') fail('SYNTAX_ERROR', 'رموز زائدة أو عملية غير مسموحة بعد التعبير', this.peek().position)
    this.require(node, kind === 'CONDITION' ? 'BOOLEAN' : 'NUMBER')
    return node
  }
  private binary(operator: Token, left: PayrollFormulaNode, right: PayrollFormulaNode): PayrollFormulaNode {
    const logical = ['AND', 'OR'].includes(operator.text), comparison = ['=', '<>', '<', '<=', '>', '>='].includes(operator.text)
    if (logical) { this.require(left, 'BOOLEAN'); this.require(right, 'BOOLEAN') }
    else if (comparison) {
      if (left.valueType !== right.valueType) fail('TYPE_MISMATCH', 'لا يجوز مقارنة رقم بقيمة منطقية', operator.position)
      if (!['=', '<>'].includes(operator.text)) { this.require(left, 'NUMBER'); this.require(right, 'NUMBER') }
    } else { this.require(left, 'NUMBER'); this.require(right, 'NUMBER') }
    return { tag: 'BINARY', operator: operator.text, left, right, position: operator.position, end: right.end, valueType: logical || comparison ? 'BOOLEAN' : 'NUMBER' }
  }
  private or(): PayrollFormulaNode {
    let node = this.and()
    while (this.peek().text === 'OR') { const op = this.next(); node = this.binary(op, node, this.and()) }
    return node
  }
  private and(): PayrollFormulaNode {
    let node = this.not()
    while (this.peek().text === 'AND') { const op = this.next(); node = this.binary(op, node, this.not()) }
    return node
  }
  private not(): PayrollFormulaNode {
    if (this.peek().text !== 'NOT') return this.comparison()
    const token = this.next(), operand = this.nested(token.position, () => this.not())
    this.require(operand, 'BOOLEAN')
    return { tag: 'UNARY', operator: 'NOT', operand, position: token.position, end: operand.end, valueType: 'BOOLEAN' }
  }
  private comparison(): PayrollFormulaNode {
    const left = this.addition()
    if (!['=', '<>', '<', '<=', '>', '>='].includes(this.peek().text)) return left
    const op = this.next()
    return this.binary(op, left, this.addition())
  }
  private addition(): PayrollFormulaNode {
    let node = this.product()
    while (['+', '-'].includes(this.peek().text)) { const op = this.next(); node = this.binary(op, node, this.product()) }
    return node
  }
  private product(): PayrollFormulaNode {
    let node = this.unary()
    while (['*', '/'].includes(this.peek().text)) { const op = this.next(); node = this.binary(op, node, this.unary()) }
    return node
  }
  private unary(): PayrollFormulaNode {
    if (!['+', '-'].includes(this.peek().text)) return this.primary()
    const token = this.next(), operand = this.nested(token.position, () => this.unary())
    this.require(operand, 'NUMBER')
    return { tag: 'UNARY', operator: token.text as '+' | '-', operand, position: token.position, end: operand.end, valueType: 'NUMBER' }
  }
  private primary(): PayrollFormulaNode {
    const token = this.next()
    if (token.type === 'NUMBER') {
      const percent = this.take('%')
      return { tag: 'NUMBER', text: token.text, percent, position: token.position, end: percent ? this.tokens[this.cursor - 1].end : token.end, valueType: 'NUMBER' }
    }
    if (token.text === '(') return this.nested(token.position, () => { const node = this.or(); this.expect(')'); return node })
    if (token.type !== 'IDENTIFIER') fail('SYNTAX_ERROR', 'متوقع عدد أو متغير أو دالة مسموحة', token.position)
    if (this.peek().text === '(') {
      if (!functions.has(token.text as FunctionName)) fail('FUNCTION_UNKNOWN', `دالة غير مسموحة: ${token.text}`, token.position)
      return this.nested(token.position, () => {
        this.next(); const args: PayrollFormulaNode[] = []
        if (this.peek().text !== ')') { args.push(this.or()); while (this.take(',')) args.push(this.or()) }
        const close = this.expect(')'), name = token.text as FunctionName
        const count = name === 'IF' || name === 'CLAMP' ? 3 : name === 'ROUND' ? 2 : name === 'MIN' || name === 'MAX' ? null : 1
        if (count === null ? args.length < 2 : args.length !== count) fail('ARITY_INVALID', `${name} تتطلب ${count ?? 'وسيطين على الأقل'} وسيطًا، ورد ${args.length}`, token.position)
        if (name === 'IF') {
          this.require(args[0], 'BOOLEAN')
          if (args[1].valueType !== args[2].valueType) fail('TYPE_MISMATCH', 'فرعا IF يجب أن يعيدا النوع نفسه', token.position)
        } else for (const arg of args) this.require(arg, 'NUMBER')
        return { tag: 'CALL', name, arguments: args, position: token.position, end: close.end, valueType: name === 'IF' ? args[1].valueType : 'NUMBER' }
      })
    }
    let group: Group = 'variables', name = token.text, end = token.end, label = name
    if (this.peek().text === '[') {
      const target = prefixes.get(token.text)
      if (!target) fail('REFERENCE_INVALID', 'يسمح بالمراجع COMP وPARAM وTYPED_DEDUCTION فقط', token.position)
      group = target; this.next(); const code = this.next()
      if (code.type !== 'IDENTIFIER') fail('REFERENCE_INVALID', 'المرجع يحتاج كودًا ثابتًا من الكتالوج', code.position)
      name = code.text; end = this.expect(']').end; label = `${token.text}[${name}]`
    }
    if (!this.known[group].has(name)) fail('REFERENCE_UNKNOWN', `متغير أو مرجع غير معرّف: ${label}`, token.position)
    if (!this.references[group].includes(name)) this.references[group].push(name)
    return { tag: 'REFERENCE', group, name, label, position: token.position, end, valueType: 'NUMBER' }
  }
}

type Value = PayrollDecimal | boolean
const numeric = (value: Value) => value as PayrollDecimal
function applyFunction(name: Exclude<FunctionName, 'IF'>, values: Value[], mode: PayrollRoundingMode, position: number): Value {
  const args = values as PayrollDecimal[]
  if (name === 'MIN' || name === 'MAX') return args.reduce((best, value) => (name === 'MIN' ? value.compare(best) < 0 : value.compare(best) > 0) ? value : best)
  if (name === 'ABS') return args[0].absolute()
  if (name === 'ROUND') {
    const scale = args[1].integerInRange(0, 6)
    if (scale === null) fail('ROUND_SCALE_INVALID', 'ROUND تحتاج عدد منازل صحيحًا من 0 إلى 6', position)
    return args[0].round(scale, mode)
  }
  if (name === 'FLOOR' || name === 'CEIL') return args[0].round(0, name)
  if (args[1].compare(args[2]) > 0) fail('CLAMP_BOUNDS_INVALID', 'الحد الأدنى في CLAMP يتجاوز الحد الأعلى', position)
  return args[0].compare(args[1]) < 0 ? args[1] : args[0].compare(args[2]) > 0 ? args[2] : args[0]
}
function applyBinary(operator: string, left: Value, right: Value): Value {
  if (operator === '+') return numeric(left).add(numeric(right))
  if (operator === '-') return numeric(left).subtract(numeric(right))
  if (operator === '*') return numeric(left).multiply(numeric(right))
  if (operator === '/') return numeric(left).divide(numeric(right))
  if (operator === 'AND') return left === true && right === true
  if (operator === 'OR') return left === true || right === true
  const comparison = typeof left === 'boolean' ? left === right ? 0 : 1 : left.compare(numeric(right))
  if (operator === '=') return comparison === 0
  if (operator === '<>') return comparison !== 0
  if (operator === '<') return comparison < 0
  if (operator === '<=') return comparison <= 0
  if (operator === '>') return comparison > 0
  return comparison >= 0
}
function literal(node: Extract<PayrollFormulaNode, { tag: 'NUMBER' }>, budget: Budget) {
  const value = PayrollDecimal.from(node.text, budget.spend)
  return node.percent ? value.divide(new PayrollDecimal(100n, 1n, budget.spend)) : value
}
function constantValidation(ast: PayrollFormulaNode, mode?: PayrollRoundingMode, parentSpend?: () => void) {
  // نتحقق من جميع الفروع قبل الحفظ؛ الكسل يخص التنفيذ فقط، ولا يخفي خطأ ثابتًا.
    const budget = new Budget(parentSpend), cache = new Map<PayrollFormulaNode, Value | null>()
    const visit = (node: PayrollFormulaNode): Value | null => budget.at(node.position, () => {
      if (cache.has(node)) return cache.get(node)!
      budget.spend(); let result: Value | null = null
      if (node.tag === 'NUMBER') result = literal(node, budget)
      else if (node.tag === 'UNARY') {
        const value = visit(node.operand)
        if (value !== null) result = node.operator === 'NOT' ? value !== true : node.operator === '-' ? numeric(value).negate() : value
      } else if (node.tag === 'BINARY') {
        const left = visit(node.left), right = visit(node.right)
        if (node.operator === '/' && right !== null && numeric(right).isZero()) fail('CONSTANT_DIVISION_BY_ZERO', 'قسمة على مقام ثابت يساوي صفرًا', node.position)
        if (left !== null && right !== null) result = applyBinary(node.operator, left, right)
      } else if (node.tag === 'CALL') {
        const args = node.arguments.map(visit)
        if (node.name === 'ROUND' && args[1] !== null && numeric(args[1]).integerInRange(0, 6) === null) fail('ROUND_SCALE_INVALID', 'ROUND تحتاج عدد منازل صحيحًا من 0 إلى 6', node.arguments[1].position)
        if (node.name === 'CLAMP' && args[1] !== null && args[2] !== null && numeric(args[1]).compare(numeric(args[2])) > 0) fail('CLAMP_BOUNDS_INVALID', 'الحد الأدنى في CLAMP يتجاوز الحد الأعلى', node.position)
        if (node.name === 'IF') { if (args[0] !== null) result = args[0] === true ? args[1] : args[2] }
        else if (args.every(value => value !== null)) {
          if (node.name === 'ROUND' && mode === undefined) {
            // الفحص النحوي لنسخة ناقصة لا يفترض قاعدة تقريب؛ ما تختلف قيمته يظل غير ثابت.
            const alternatives = roundingModes.map(rounding => numeric(applyFunction('ROUND', args as Value[], rounding, node.position)))
            result = alternatives.every(value => value.compare(alternatives[0]) === 0) ? alternatives[0] : null
          } else result = applyFunction(node.name, args as Value[], mode ?? 'HALF_UP', node.position)
        }
      }
      cache.set(node, result); return result
    })
    visit(ast)
}

function compileCore(text: string, options: PayrollFormulaCompileOptions, parentSpend?: () => void): CompiledPayrollFormula {
  const catalog = catalogOf(options), kind = options.kind ?? 'AMOUNT'
  if (kind !== 'AMOUNT' && kind !== 'CONDITION') fail('KIND_INVALID', 'نوع المعادلة يجب أن يكون AMOUNT أو CONDITION', 1)
  if (options.roundingMode !== undefined && !roundingModes.includes(options.roundingMode)) fail('OPTIONS_INVALID', 'قاعدة التقريب غير صالحة', 1)
  const parser = new Parser(tokenize(text), catalog), ast = parser.parse(kind)
  constantValidation(ast, options.roundingMode, parentSpend)
  return { contractVersion: 'SRS_V1', source: text, kind, catalog, ast, references: parser.references, ...(options.roundingMode === undefined ? {} : { roundingMode: options.roundingMode }) }
}

export function compilePayrollFormula(text: string, options: PayrollFormulaCompileOptions = { variables: [] }): CompiledPayrollFormula {
  return compileCore(text, options)
}

function evaluateCore(compiled: CompiledPayrollFormula, input: PayrollExactFormulaInputs, options: PayrollExactFormulaEvaluationOptions, allowExact: boolean) {
  if (!compiled || compiled.contractVersion !== 'SRS_V1') fail('CONTRACT_INVALID', 'عقد المعادلة غير معروف؛ لا يوجد تحويل تلقائي إلى العقد القديم', 1)
  if (!options || !['ZERO_WITH_WARNING', 'FAIL_ROW'].includes(options.divisionByZeroMode) || !roundingModes.includes(options.roundingMode) || (options.spend !== undefined && typeof options.spend !== 'function')) {
    fail('OPTIONS_INVALID', 'إعدادات القسمة أو التقريب غير صالحة', 1)
  }
  // إعادة التحليل تحمي المدخل JSON من شجرة مزورة أو دائرية؛ التنفيذ يعرف مصدرًا وكتالوجًا محدودين فقط.
  const verified = compileCore(compiled.source, { ...compiled.catalog, kind: compiled.kind, roundingMode: options.roundingMode }, allowExact ? options.spend : undefined)
  const budget = new Budget(allowExact ? options.spend : undefined), warnings: PayrollFormulaWarning[] = [], consumed = new Map<string, string>(), values = new Map<string, PayrollDecimal>()
  const replacements = new Map<number, { end: number; value: string }>()
  const valueReferences = new Set<string>()
  const read = (node: Extract<PayrollFormulaNode, { tag: 'REFERENCE' }>) => {
    if (!values.has(node.label)) {
      const groupDescriptor = input && typeof input === 'object' ? Object.getOwnPropertyDescriptor(input, node.group) : undefined
      if (groupDescriptor && !own(groupDescriptor, 'value')) fail('INPUT_INVALID', 'مدخلات المعادلة لا تقبل خصائص محسوبة', node.position)
      const record: unknown = groupDescriptor?.value
      if (record !== undefined && (record === null || typeof record !== 'object' || Array.isArray(record))) fail('INPUT_INVALID', `قائمة ${node.group} غير صالحة`, node.position)
      const descriptor = record ? Object.getOwnPropertyDescriptor(record, node.name) : undefined
      if (descriptor && !own(descriptor, 'value')) fail('INPUT_INVALID', 'مدخلات المعادلة لا تقبل خصائص محسوبة', node.position)
      const value: unknown = descriptor?.value
      let decimal: PayrollDecimal
      if (value === undefined || value === null) {
        decimal = new PayrollDecimal(0n, 1n, budget.spend)
        warnings.push({ code: 'MISSING_INPUT', message: `القيمة ${node.label} غير موجودة؛ استُخدم صفر`, position: node.position, reference: node.label })
      } else {
        if (allowExact && value instanceof PayrollDecimal) {
          // لا نستدعي دوال الكائن الوارد ولا نثق بنموذجه؛ نعيد بناء الكسر من خاصيتين ذاتيتين فقط.
          const numerator = Object.getOwnPropertyDescriptor(value, 'numerator'), denominator = Object.getOwnPropertyDescriptor(value, 'denominator')
          if (!numerator || !denominator || !own(numerator, 'value') || !own(denominator, 'value') || typeof numerator.value !== 'bigint' || typeof denominator.value !== 'bigint') {
            fail('INPUT_INVALID', `الكسر الداخلي ${node.label} غير صالح`, node.position)
          }
          decimal = new PayrollDecimal(numerator.value, denominator.value, budget.spend)
        } else {
          if (typeof value !== 'number' && typeof value !== 'string') fail('INPUT_INVALID', `القيمة ${node.label} يجب أن تكون عددًا أو نصًا عشريًا`, node.position)
          decimal = PayrollDecimal.from(value, budget.spend)
        }
      }
      let representation: string
      try { representation = decimal.canonical() } catch (error) {
        if (!allowExact || !(error instanceof PayrollDecimalError) || error.code !== 'INPUT_INVALID') throw error
        representation = `${decimal.numerator}/${decimal.denominator}`
      }
      values.set(node.label, decimal); consumed.set(node.label, representation)
    }
    replacements.set(node.position, { end: node.end, value: consumed.get(node.label)! })
    return values.get(node.label)!
  }
  const visit = (node: PayrollFormulaNode, contributes = true): Value => budget.at(node.position, () => {
    budget.spend()
    if (node.tag === 'NUMBER') return literal(node, budget)
    if (node.tag === 'REFERENCE') {
      if (allowExact && contributes) valueReferences.add(node.label)
      return read(node)
    }
    const numericContribution = contributes && node.valueType === 'NUMBER'
    if (node.tag === 'UNARY') { const value = visit(node.operand, numericContribution); return node.operator === 'NOT' ? value !== true : node.operator === '-' ? numeric(value).negate() : value }
    if (node.tag === 'CALL') {
      if (node.name === 'IF') return visit(node.arguments[0], false) === true ? visit(node.arguments[1], numericContribution) : visit(node.arguments[2], numericContribution)
      // وسيط عدد المنازل في ROUND يضبط التقريب ولا يمثل مبلغًا داخل الناتج.
      return applyFunction(node.name, node.arguments.map((argument, index) => visit(argument, numericContribution && !(node.name === 'ROUND' && index === 1))), options.roundingMode, node.position)
    }
    const left = visit(node.left, numericContribution)
    if (node.operator === 'AND' && left === false) return false
    if (node.operator === 'OR' && left === true) return true
    const right = visit(node.right, numericContribution)
    if (node.operator === '/' && numeric(right).isZero()) {
      if (options.divisionByZeroMode === 'FAIL_ROW') fail('DIVISION_BY_ZERO', 'مقام المعادلة يساوي صفرًا؛ تعذر احتساب البند', node.position)
      warnings.push({ code: 'DIVISION_BY_ZERO', message: 'مقام المعادلة يساوي صفرًا؛ استُخدم صفر مع تحذير', position: node.position, expression: verified.source })
      return new PayrollDecimal(0n, 1n, budget.spend)
    }
    return applyBinary(node.operator, left, right)
  })
  const evaluated = visit(verified.ast)
  let substitutedExpression = verified.source
  for (const [position, replacement] of [...replacements].sort((a, b) => b[0] - a[0])) {
    substitutedExpression = substitutedExpression.slice(0, position - 1) + `(${replacement.value})` + substitutedExpression.slice(replacement.end)
  }
  return { evaluated, budget, position: verified.ast.position, warnings, inputs: Object.fromEntries(consumed), substitutedExpression, valueReferences: [...valueReferences].sort() }
}

/** ناتج داخلي دقيق دون تقريب ضمني؛ ROUND الصريحة داخل النص تظل نافذة. */
export function evaluatePayrollFormulaExact(compiled: CompiledPayrollFormula, input: PayrollExactFormulaInputs = {}, options: PayrollExactFormulaEvaluationOptions): PayrollExactFormulaResult {
  const result = evaluateCore(compiled, input, options, true)
  return { exactValue: result.evaluated, warnings: result.warnings, inputs: result.inputs, substitutedExpression: result.substitutedExpression, valueReferences: result.valueReferences }
}

export function evaluatePayrollFormula(compiled: CompiledPayrollFormula, input: PayrollFormulaInputs = {}, options: PayrollFormulaEvaluationOptions) {
  if (!options || !Number.isInteger(options.roundingScale) || options.roundingScale < 0 || options.roundingScale > 6) fail('OPTIONS_INVALID', 'إعدادات القسمة أو التقريب غير صالحة', 1)
  const result = evaluateCore(compiled, input, options, false)
  return result.budget.at(result.position, () => ({
    value: typeof result.evaluated === 'boolean' ? result.evaluated : result.evaluated.format(options.roundingScale, options.roundingMode),
    rawValue: typeof result.evaluated === 'boolean' ? result.evaluated : result.evaluated.format(6, 'HALF_UP'),
    warnings: result.warnings, inputs: result.inputs, substitutedExpression: result.substitutedExpression,
  }))
}
