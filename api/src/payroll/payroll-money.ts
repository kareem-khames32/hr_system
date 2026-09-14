/** نقرّب مجموع البند مرة واحدة، مع معالجة خطأ التمثيل الثنائي قرب نصف القرش. */
export function roundPayrollMoney(value: number): number {
  const scaled = Math.abs(value) * 100
  const tolerance = Number.EPSILON * Math.max(1, scaled) * 4
  return Math.sign(value) * Math.round(scaled + tolerance) / 100
}
