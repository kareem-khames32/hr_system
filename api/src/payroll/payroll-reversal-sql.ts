// C8 / الخطوة 31: شرط SQL مشترك لقارئي «مسير معتمد أو مصروف للموظف» — بند المسير (runId, employeeId) الذي عُكس صرفه بقيد عكس مُنفَّذ (POSTED)
// لم يعد يحجز فترة الموظف ولا مصادر إضافيه وأقساطه ولا يقفل حضوره وأجره. صفوف المسير الأصلي نفسها لا تُعدَّل؛ الأثر يُقرأ من سطور العكس.
// الملف بلا استيراد عمدًا: يستدعيه الحضور والأجر والتصفية والمزودات الحية دون حلقات اعتماد بين الوحدات.

export const PAYROLL_REVERSAL_LINES_TABLE = 'payroll_run_reversal_lines'

const SQL_EXPRESSION = /^[A-Za-z_][A-Za-z0-9_]*(\.\[?[A-Za-z_][A-Za-z0-9_]*\]?)?$|^@\d+$/

/**
 * `NOT EXISTS (...)`: لا سطر عكس مُنفَّذ لبند الموظف في المسير. التعبيران أسماء أعمدة أو معاملات (`r.id`، `i.[employeeId]`، `@2`) — لا نص من المستخدم.
 * الاسم المستعار يُمرر عند استخدام الشرط أكثر من مرة في الاستعلام نفسه.
 */
export function payrollLineNotReversedSql(runIdExpr: string, employeeIdExpr: string, alias = 'rvl'): string {
  if (!SQL_EXPRESSION.test(runIdExpr) || !SQL_EXPRESSION.test(employeeIdExpr) || !/^[a-z][a-z0-9_]*$/.test(alias)) {
    throw new Error('Invalid payroll reversal SQL expression')
  }
  return `NOT EXISTS (SELECT 1 FROM dbo.[${PAYROLL_REVERSAL_LINES_TABLE}] ${alias} WHERE ${alias}.[originalRunId]=${runIdExpr} AND ${alias}.[employeeId]=${employeeIdExpr} AND ${alias}.[status]='POSTED')`
}
