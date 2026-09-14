// تصدير CSV من الصفوف المحمّلة في الشاشة — BOM حتى تفتح العربية سليمة في Excel
const CSV_BOM = String.fromCharCode(0xfeff)

// خلية CSV: اقتباس عند الفواصل/الأسطر، وتحييد النص الذي يبدأ بـ = + - @
// حتى لا ينفّذه Excel كمعادلة (حقن CSV)
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ينزّل ملف CSV باسم filename — الصف الأول عناوين الأعمدة
export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const csv =
    CSV_BOM + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // الإلغاء بعد بدء التنزيل — الإلغاء الفوري قد يقطعه في بعض المتصفحات
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// تاريخ اليوم المحلي YYYY-MM-DD لاسم الملف
export const csvDateStamp = () => new Date().toLocaleDateString('en-CA')
