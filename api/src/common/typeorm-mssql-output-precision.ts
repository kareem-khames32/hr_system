import { TableColumn } from 'typeorm'
import type { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { SqlServerDriver } from 'typeorm/driver/sqlserver/SqlServerDriver'

// تصليح في TypeORM على SQL Server (ظاهر في 0.3.31): بعد INSERT بيرجّع قيم الأعمدة المولّدة واللي ليها قيمة افتراضية عن طريق متغير جدول
// (@OutputTable)، وبيعرّف أعمدته بالنوع والطول بس — من غير precision ولا scale. فعمود decimal(18,2) بيتعرّف `decimal` (= decimal(18,0))
// والقيمة الراجعة بتتقرّب لعدد صحيح:
//   - الكائن اللي في الذاكرة بياخد 123 بدل 123.45 (والصف المحفوظ في القاعدة سليم).
//   - أي save تاني لنفس الكائن بيكتب المقرّب في القاعدة (TypeORM بيقارن الذاكرة بالمحفوظ فبيلاقي «تغيير»).
// اتكشف من ملاحظة مراجعة Codex على حدث حساب المسير (CRP2B-B-N01: «إضافات أخرى» في الحدث 123 والبند 123.45)، وأثره أوسع: مثلًا إنشاء
// موظف ببدل سكن 1250.50 كان بيتخزن 1251 (الإنشاء بيحفظ الكائن مرتين).
// الحل: نفس تعريف TypeORM بالحرف + precision وscale من تعريف العمود، فمتغير الجدول يبقى بنفس نوع العمود الحقيقي.
const PATCHED = Symbol.for('hr.typeorm.mssql.output-table-precision')

export function patchMssqlOutputTablePrecision(): void {
  const prototype = SqlServerDriver.prototype as unknown as Record<string | symbol, unknown> & {
    escape(name: string): string
    normalizeType(column: ColumnMetadata): string
    createFullType(column: TableColumn): string
  }
  if (prototype[PATCHED]) return
  prototype.buildTableVariableDeclaration = function (this: typeof prototype, identifier: string, columns: ColumnMetadata[]): string {
    const outputColumns = columns.map(column => `${this.escape(column.databaseName)} ${this.createFullType(new TableColumn({
      name: column.databaseName,
      type: this.normalizeType(column),
      length: column.length,
      precision: column.precision,
      scale: column.scale,
      isNullable: column.isNullable,
      isArray: column.isArray,
    }))}`)
    return `DECLARE ${identifier} TABLE (${outputColumns.join(', ')})`
  }
  prototype[PATCHED] = true
}

patchMssqlOutputTablePrecision()
