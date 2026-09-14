import { BadRequestException } from '@nestjs/common'
import { PAYROLL_SRS_CATALOG_VERSION, PAYROLL_SRS_VARIABLE_CODES, PAYROLL_SRS_VARIABLES, validatePayrollFormulaSymbols } from './payroll-formula-catalog'
import { validatePayrollComponentOrder } from './payroll-component-order'
import { compilePayrollFormula, evaluatePayrollFormula, PayrollFormulaError } from './payroll-formula-engine'
import { TestPayrollFormulaDto, ValidatePayrollComponentOrderDto, ValidatePayrollFormulaDto } from './payroll-formula.dto'
import type { PayrollPolicySettings } from './payroll-policy-settings'

const contract = { contractVersion: 'SRS_V1' as const, catalogVersion: PAYROLL_SRS_CATALOG_VERSION }
const inputGroups = ['variables', 'components', 'parameters', 'typedDeductions'] as const
const attendanceVariables = ['LATE_MINUTES', 'SHORT_MINUTES', 'ABSENCE_DAYS', 'LATE_INCIDENTS']

// المختبر يعمل على قيم تجريبية صريحة؛ لا يجلب أجورًا أو بصمات ولا يحفظ أي نتيجة.
export function payrollFormulaCatalog() {
  return { ...contract, variables: PAYROLL_SRS_VARIABLES,
    references: ['COMP[CODE]', 'PARAM[NAME]', 'TYPED_DEDUCTION[CODE]'],
    functions: ['MIN(a,b,…)', 'MAX(a,b,…)', 'ABS(x)', 'ROUND(x,n)', 'FLOOR(x)', 'CEIL(x)', 'CLAMP(x,lo,hi)', 'IF(condition,a,b)'],
    limits: { textLength: 500, tokens: 200, nesting: 10, components: 200 },
    supportsPersistence: false, supportsLiveEmployeeInputs: false }
}

function formulaError(error: unknown): never {
  if (error instanceof BadRequestException) throw error
  if (error instanceof PayrollFormulaError) throw new BadRequestException({ code: error.code, message: error.message, position: error.position })
  // أخطاء تعريف الرموز لا تتضمن بيانات موظفين أو تفاصيل قاعدة البيانات.
  if (error instanceof Error) throw new BadRequestException({ code: 'FORMULA_SYMBOLS_INVALID', message: error.message, position: 1 })
  throw error
}

function compile(dto: ValidatePayrollFormulaDto, roundingMode?: PayrollPolicySettings['roundingMode']) {
  try {
    // نحول DTO المتحقق إلى قيم مملوكة عادية؛ المحلل النقي لا يقبل وراثة الكلاسات ككتالوج.
    const symbols = { ...dto.symbols }
    validatePayrollFormulaSymbols(symbols)
    return compilePayrollFormula(dto.formula, { variables: [...PAYROLL_SRS_VARIABLE_CODES], ...symbols, kind: dto.kind ?? 'AMOUNT', roundingMode })
  } catch (error) { return formulaError(error) }
}

export function validatePolicyFormula(dto: ValidatePayrollFormulaDto, roundingMode?: PayrollPolicySettings['roundingMode']) {
  const compiled = compile(dto, roundingMode)
  return { valid: true, ...contract, kind: dto.kind ?? 'AMOUNT', references: compiled.references, roundingMode: roundingMode ?? null }
}

export function testPolicyFormula(dto: TestPayrollFormulaDto, settings: PayrollPolicySettings) {
  const compiled = compile(dto, settings.roundingMode)
  const inputs: Record<typeof inputGroups[number], Record<string, string | number | null>> = {
    variables: Object.create(null), components: Object.create(null), parameters: Object.create(null), typedDeductions: Object.create(null),
  }
  for (const group of inputGroups) {
    const values = dto.inputs?.[group] ?? {}
    const allowed = new Set(group === 'variables' ? PAYROLL_SRS_VARIABLE_CODES : dto.symbols?.[group] ?? [])
    if (Object.keys(values).length > 200) throw new BadRequestException('عدد قيم الاختبار يتجاوز الحد المسموح')
    for (const [key, value] of Object.entries(values)) {
      if (!allowed.has(key)) throw new BadRequestException({ code: 'FORMULA_INPUT_UNKNOWN', message: `مدخل غير معرّف: ${group}.${key}`, position: 1 })
      const validNumber = typeof value === 'number' && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))
      const validText = typeof value === 'string' && value.length <= 80 && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && value.replace(/\D/g, '').length <= 60
      if (value !== null && !validNumber && !validText) throw new BadRequestException({ code: 'FORMULA_INPUT_INVALID', message: `قيمة ${group}.${key} يجب أن تكون رقمًا عشريًا صالحًا؛ استخدم نصًا للأرقام الكبيرة`, position: 1 })
      inputs[group][key] = value
    }
  }
  const exempt = inputs.variables.IS_ATTENDANCE_EXEMPT
  const exemptText = exempt == null ? '0' : String(exempt)
  const isExempt = /^\+?0*1(?:\.0*)?$/.test(exemptText)
  if (!isExempt && !/^[+-]?(?:0+(?:\.0*)?|\.0+)$/.test(exemptText)) throw new BadRequestException({ code: 'FORMULA_INPUT_INVALID', message: 'علم الاستثناء من الحضور يقبل صفرًا أو واحدًا فقط', position: 1 })
  const exempted = isExempt ? attendanceVariables.filter(code => compiled.references.variables.includes(code)) : []
  if (isExempt) for (const code of attendanceVariables) inputs.variables[code] = '0'
  try {
    const result = evaluatePayrollFormula(compiled, inputs, {
      divisionByZeroMode: settings.divisionByZeroMode, roundingMode: settings.roundingMode, roundingScale: settings.roundingScale,
    })
    if (exempted.length) {
      result.warnings.unshift({ code: 'ATTENDANCE_EXEMPT', message: `صُفّرت مدخلات الاستثناء من الحضور: ${exempted.join('، ')}`, position: 1 })
      result.inputs.IS_ATTENDANCE_EXEMPT = '1'
    }
    return { ...contract, formula: dto.formula, kind: dto.kind ?? 'AMOUNT', ...result }
  } catch (error) { return formulaError(error) }
}

export function validatePolicyComponentOrder(dto: ValidatePayrollComponentOrderDto, roundingMode?: PayrollPolicySettings['roundingMode']) {
  const symbols = { ...dto.symbols, components: dto.components.map(item => item.code) }
  try { validatePayrollFormulaSymbols(symbols) } catch (error) { return formulaError(error) }
  const items = dto.components.map(item => {
    if (item.code === 'NET' && (item.formula !== undefined || item.conditionFormula !== undefined)) {
      throw new BadRequestException({ code: 'SYSTEM_NET_IMMUTABLE', message: 'الصافي بند نظامي؛ لا يقبل معادلة أو شرطًا يتجاوز حسابه', componentCode: item.code })
    }
    const dependencies = new Set<string>()
    for (const [field, kind] of [['formula', 'AMOUNT'], ['conditionFormula', 'CONDITION']] as const) {
      if (item[field] === undefined) continue
      try {
        const compiled = compile({ formula: item[field], kind, symbols }, roundingMode)
        for (const code of compiled.references.components) dependencies.add(code)
      } catch (error) {
        if (error instanceof BadRequestException) {
          const response = error.getResponse()
          throw new BadRequestException({ ...(typeof response === 'object' ? response : { message: response }), componentCode: item.code, field })
        }
        throw error
      }
    }
    return { code: item.code, stage: item.stage, sequence: item.sequence, isActive: item.isActive, dependencies: [...dependencies] }
  })
  const result = validatePayrollComponentOrder(items, { autoOrder: dto.autoOrder ?? false })
  if (!result.ok) {
    const primary = result.errors.find(error => error.code === 'DEPENDENCY_CYCLE') ?? result.errors[0]
    throw new BadRequestException({ code: 'POLICY_COMPONENT_ORDER_INVALID', message: primary?.message ?? 'ترتيب بنود السياسة غير صالح', errors: result.errors })
  }
  return { valid: true, ...contract, ...result }
}
