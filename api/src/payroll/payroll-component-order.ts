import { PAYROLL_FORMULA_SYMBOL_PATTERN, validatePayrollFormulaSymbols } from './payroll-formula-catalog'

export interface PayrollOrderedComponent {
  code: string
  stage: number
  sequence: number
  isActive: boolean
  dependencies: string[]
}
export interface PayrollComponentOrderError { code: string; message: string; path?: string[]; componentCode?: string }
export interface PayrollComponentOrderResult {
  ok: boolean
  errors: PayrollComponentOrderError[]
  warnings: Array<{ code: string; message: string }>
  order: string[]
  suggestedSequences: Array<{ code: string; stage: number; sequence: number }>
}

export const PAYROLL_COMPONENT_LIMIT = 200
export const PAYROLL_COMPONENT_DEPENDENCY_LIMIT = 200
const compareCode = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0
const manualCompare = (left: PayrollOrderedComponent, right: PayrollOrderedComponent) =>
  left.stage - right.stage || left.sequence - right.sequence || compareCode(left.code, right.code)

// التحقق لمجموعة سياسة كاملة، ولا يحسب الصافي أو السقوف ولا يغير البنود المرسلة.
export function validatePayrollComponentOrder(items: PayrollOrderedComponent[], options?: { autoOrder?: boolean }): PayrollComponentOrderResult {
  const result: PayrollComponentOrderResult = { ok: false, errors: [], warnings: [], order: [], suggestedSequences: [] }
  const error = (code: string, message: string, componentCode?: string, path?: string[]) => {
    result.errors.push({ code, message, ...(componentCode ? { componentCode } : {}), ...(path ? { path } : {}) })
  }
  if (options !== undefined && (options === null || typeof options !== 'object' || Array.isArray(options) ||
      (options.autoOrder !== undefined && typeof options.autoOrder !== 'boolean'))) {
    error('INVALID_OPTIONS', 'autoOrder يجب أن تكون قيمة منطقية'); return result
  }
  const autoOrder = options?.autoOrder === true
  if (!Array.isArray(items)) { error('INVALID_COMPONENTS', 'البنود يجب أن تكون قائمة'); return result }
  if (items.length > PAYROLL_COMPONENT_LIMIT) { error('COMPONENT_LIMIT', `عدد البنود يتجاوز الحد التقني ${PAYROLL_COMPONENT_LIMIT}`); return result }
  const byCode = new Map<string, PayrollOrderedComponent>(), sequenceOwners = new Map<string, string>()
  let duplicateSequences = false
  for (const [index, item] of items.entries()) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) { error('INVALID_COMPONENT', `البند رقم ${index + 1} غير صالح`); continue }
    let valid = true
    try { validatePayrollFormulaSymbols({ components: [item.code] }) } catch (cause) {
      error('INVALID_COMPONENT_CODE', cause instanceof Error ? cause.message : 'كود البند غير صالح'); valid = false
    }
    if (typeof item.code === 'string' && byCode.has(item.code)) { error('DUPLICATE_COMPONENT_CODE', `كود البند «${item.code}» مكرر`, item.code); valid = false }
    if (!Number.isInteger(item.stage) || item.stage < 1 || item.stage > 6) { error('INVALID_STAGE', `مرحلة البند «${item.code}» يجب أن تكون عددًا صحيحًا من 1 إلى 6`, item.code); valid = false }
    if (!Number.isSafeInteger(item.sequence) || item.sequence < 1) { error('INVALID_SEQUENCE', `تسلسل البند «${item.code}» يجب أن يكون عددًا صحيحًا موجبًا وآمنًا`, item.code); valid = false }
    if (typeof item.isActive !== 'boolean') { error('INVALID_ACTIVE_FLAG', `حالة تفعيل البند «${item.code}» يجب أن تكون قيمة منطقية`, item.code); valid = false }
    if (!Array.isArray(item.dependencies) || item.dependencies.length > PAYROLL_COMPONENT_DEPENDENCY_LIMIT) {
      error('INVALID_DEPENDENCIES', `اعتماديات البند «${item.code}» يجب أن تكون قائمة بحد أقصى ${PAYROLL_COMPONENT_DEPENDENCY_LIMIT}`, item.code); valid = false
    } else {
      const seen = new Set<string>()
      for (const dependency of item.dependencies) {
        if (typeof dependency !== 'string' || !PAYROLL_FORMULA_SYMBOL_PATTERN.test(dependency)) { error('INVALID_DEPENDENCY_CODE', `مرجع غير صالح داخل البند «${item.code}»`, item.code); valid = false }
        else if (seen.has(dependency)) { error('DUPLICATE_DEPENDENCY', `البند «${item.code}» يكرر المرجع «${dependency}»`, item.code); valid = false }
        seen.add(dependency)
      }
    }
    if (!valid) continue
    const sequenceKey = `${item.stage}:${item.sequence}`, owner = sequenceOwners.get(sequenceKey)
    if (owner) {
      duplicateSequences = true
      if (!autoOrder) error('DUPLICATE_SEQUENCE', `البندان «${owner}» و«${item.code}» لهما التسلسل ${item.sequence} في المرحلة ${item.stage}`, item.code)
    } else sequenceOwners.set(sequenceKey, item.code)
    byCode.set(item.code, { ...item, dependencies: [...item.dependencies] })
  }
  // الأخطاء البنيوية لا تُعالج بإسقاط بنود أو اعتماديات من المجموعة.
  if (result.errors.some(item => item.code !== 'DUPLICATE_SEQUENCE')) return result
  const net = byCode.get('NET')
  if (!net) error('NET_REQUIRED', 'المجموعة الكاملة تتطلب بند النظام «NET» للصافي')
  else {
    if (!net.isActive) error('NET_DISABLED', 'لا يجوز تعطيل بند النظام «NET» للصافي', 'NET')
    if (net.stage !== 6) error('NET_STAGE_INVALID', 'بند النظام «NET» يجب أن يبقى في المرحلة السادسة', 'NET')
  }
  const manual = [...byCode.values()].sort(manualCompare)
  if (net?.stage === 6 && manual[manual.length - 1]?.code !== 'NET' && !autoOrder) error('NET_NOT_LAST', 'بند النظام «NET» يجب أن يكون آخر بنود المرحلة السادسة', 'NET')
  for (const item of manual) {
    for (const dependency of [...item.dependencies].sort(compareCode)) {
      const target = byCode.get(dependency)
      if (!target) { error('MISSING_DEPENDENCY', `البند «${item.code}» يشير إلى بند غير موجود «${dependency}»`, item.code); continue }
      if (!target.isActive) error('DISABLED_DEPENDENCY', `البند «${item.code}» يشير إلى البند المعطّل «${dependency}»؛ أزل المرجع صراحة قبل تعطيله`, item.code)
      if (target.stage > item.stage) error('CROSS_STAGE_FORWARD_REFERENCE', `مرجع أمامي: البند «${item.code}» في المرحلة ${item.stage} يعتمد على «${dependency}» في المرحلة اللاحقة ${target.stage}`, item.code)
      else if (dependency === 'NET' && item.code !== 'NET') error('NET_FORWARD_REFERENCE', `البند «${item.code}» لا يمكن أن يعتمد على «NET»؛ الصافي هو آخر بند نظامي`, item.code)
      else if (target.stage === item.stage && target.sequence >= item.sequence && !autoOrder) error('FORWARD_REFERENCE', `مرجع أمامي: البند «${item.code}» يسبق أو يساوي البند الذي يعتمد عليه «${dependency}» في التسلسل`, item.code)
    }
  }
  const visitState = new Map<string, 1 | 2>(), stack: string[] = []
  const findCycle = (code: string): string[] | undefined => {
    if (visitState.get(code) === 1) return [...stack.slice(stack.indexOf(code)), code]
    if (visitState.get(code) === 2) return
    visitState.set(code, 1); stack.push(code)
    for (const dependency of [...byCode.get(code)!.dependencies].sort(compareCode)) {
      if (!byCode.has(dependency)) continue
      const cycle = findCycle(dependency)
      if (cycle) return cycle
    }
    stack.pop(); visitState.set(code, 2)
  }
  for (const code of [...byCode.keys()].sort(compareCode)) {
    const path = findCycle(code)
    if (path) { error('DEPENDENCY_CYCLE', `حلقة اعتماد بين البنود: ${path.join(' → ')}`, code, path); break }
  }
  // يمكن عرض اقتراح لتصحيح الترتيب اليدوي وحده؛ بقية العيوب تحتاج إصلاحًا صريحًا.
  if (result.errors.some(item => !['DUPLICATE_SEQUENCE', 'FORWARD_REFERENCE', 'NET_NOT_LAST'].includes(item.code))) return result
  const indegree = new Map(manual.map(item => [item.code, item.dependencies.length]))
  const dependents = new Map(manual.map(item => [item.code, [] as string[]]))
  for (const item of manual) for (const dependency of item.dependencies) dependents.get(dependency)!.push(item.code)
  const readyCompare = (left: PayrollOrderedComponent, right: PayrollOrderedComponent) => {
    if (left.code === right.code) return 0
    if (left.stage === right.stage && (left.code === 'NET' || right.code === 'NET')) return left.code === 'NET' ? 1 : -1
    return manualCompare(left, right)
  }
  const ready = manual.filter(item => indegree.get(item.code) === 0).sort(readyCompare), ordered: PayrollOrderedComponent[] = []
  while (ready.length) {
    const item = ready.shift()!; ordered.push(item)
    for (const code of dependents.get(item.code)!) {
      const remaining = indegree.get(code)! - 1; indegree.set(code, remaining)
      if (remaining === 0) ready.push(byCode.get(code)!)
    }
    ready.sort(readyCompare)
  }
  if (ordered.length !== manual.length) { error('DEPENDENCY_CYCLE', 'تعذر ترتيب المجموعة بسبب حلقة اعتماد'); return result }
  const stageSequence = new Map<number, number>()
  result.suggestedSequences = ordered.map(item => {
    const sequence = (stageSequence.get(item.stage) ?? 0) + 1; stageSequence.set(item.stage, sequence)
    return { code: item.code, stage: item.stage, sequence }
  })
  if (autoOrder && (duplicateSequences || result.suggestedSequences.some(item => item.sequence !== byCode.get(item.code)!.sequence))) {
    result.warnings.push({ code: 'AUTO_ORDER_APPLIED', message: 'اقتُرح ترتيب حتمي للاعتماديات وتسلسلات فريدة داخل كل مرحلة؛ لم تُنقل مرحلة أو يُفعّل بند أو يُحذف مرجع' })
  }
  result.ok = result.errors.length === 0
  // البنود المعطلة تبقى في اقتراح التسلسلات لحفظ تعريفها، ولا تدخل ترتيب التنفيذ.
  if (result.ok) result.order = (autoOrder ? ordered : manual).filter(item => item.isActive).map(item => item.code)
  return result
}
