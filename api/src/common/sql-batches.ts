import type { ObjectLiteral, Repository } from 'typeorm'

// SQL Server بيرفض أي جملة فيها أكتر من 2,100 قيمة (الخطأ 8003)، وTypeORM بيحفظ المصفوفة كلها في INSERT واحد
// لو ماقلناش غير كده. ثبت حيًّا في المراجعة المستقلة (24 سبتمبر — CR2-B01): حساب مسير 500 موظف وقع عند حفظ
// أعضاء المسير (500 × 6 أعمدة = 3,000 قيمة)، فأي مسير فوق ~350 موظف كان بيفشل بعد ما يخلص الحساب كله.
// الحد هنا أقل من 2,100 بهامش لأي قيمة زيادة يضيفها TypeORM للجملة.
export const SQL_SERVER_PARAMETER_BUDGET = 2000

/** حجم الدفعة لجدول بعدد أعمدته: عشان إضافة عمود للكيان بعدين ماترجّعش نفس الخطأ. */
export function sqlBatchSize(columnsPerRow: number): number {
  return Math.max(1, Math.floor(SQL_SERVER_PARAMETER_BUDGET / Math.max(1, columnsPerRow)))
}

/** حفظ صفوف كتير على دفعات تحت حد SQL Server، داخل نفس المعاملة اللي المستودع تابع لها. */
export async function saveInSqlBatches<T extends ObjectLiteral>(repo: Repository<T>, rows: T[]): Promise<T[]> {
  if (!rows.length) return rows
  return repo.save(rows, { chunk: sqlBatchSize(repo.metadata.columns.length) })
}
