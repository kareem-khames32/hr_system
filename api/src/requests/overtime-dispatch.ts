import type { EntityManager, QueryRunner } from 'typeorm'

const KEY = 'overtimeDispatchAfterCommit'
type Pending = Map<number, Set<number>>
const depthOf = (runner: QueryRunner) => (runner as QueryRunner & { transactionDepth: number }).transactionDepth

/** تحفظ المعاملة معرفات الكشف فقط؛ لا اتصال بمحرك الطلبات أثناء حجز الموظف. */
export function queueOvertimeDispatch(manager: EntityManager, entryId: number) {
  const runner = manager.queryRunner
  if (!runner?.isTransactionActive || !Number.isSafeInteger(entryId) || entryId < 1) {
    throw new Error('تجهيز توجيه الإضافي يتطلب مصدراً محفوظاً داخل المعاملة')
  }
  const pending: Pending = runner.data[KEY] ??= new Map<number, Set<number>>()
  const depth = depthOf(runner)
  const ids = pending.get(depth) ?? new Set<number>()
  ids.add(entryId)
  pending.set(depth, ids)
}

/** اعتماد savepoint داخلي ينقل العمل للأب؛ الالتزام الخارجي وحده يسمح بالتوجيه. */
export function mergeNestedOvertimeDispatch(runner: QueryRunner) {
  const pending = runner.data[KEY] as Pending | undefined, depth = depthOf(runner)
  if (!pending || depth <= 1) return
  const ids = pending.get(depth)
  if (!ids) return
  const parent = pending.get(depth - 1) ?? new Set<number>()
  for (const id of ids) parent.add(id)
  pending.set(depth - 1, parent)
  pending.delete(depth)
}

/** التراجع الداخلي يلغي حصته فقط؛ لا يلغي كشفاً ثبت في مستوى الأب. */
export function discardRolledBackOvertimeDispatch(runner: QueryRunner) {
  const pending = runner.data[KEY] as Pending | undefined, depth = depthOf(runner)
  if (!pending) return
  for (const level of pending.keys()) if (level >= depth) pending.delete(level)
  if (!pending.size) delete runner.data[KEY]
}

export function takeCommittedOvertimeDispatch(runner: QueryRunner): number[] {
  if (runner.isTransactionActive) return []
  const pending = runner.data[KEY] as Pending | undefined
  delete runner.data[KEY]
  return pending ? [...new Set([...pending.values()].flatMap(ids => [...ids]))] : []
}
