// B-ADD.17 (طلب المالك 12 أكتوبر): «الطلب وقف عند مين؟» — نص سطر «واقف عند» من رد الخادم (waitingAt على الطلب اللي قيد المراجعة).
// الأسماء من الخادم بحكم محرك الطلبات نفسه؛ هنا العرض بس. من غير استيراد (@/) عشان الاختبارات تقرا الملف مباشرة.

export interface ApiWaitingPerson {
  name: string
  /** المسمى الحالي — null لو فرعه برّه نطاقك (بيتكتب اسم الدور مكانه) */
  jobTitle: string | null
  role: string
  /** الخطوة عنده بتفويض: اسم المفوِّض — null لو اسمه مش ظاهر لك */
  onBehalfOfName?: string | null
}

export interface ApiRequestWaitingAt {
  stepOrder: number
  /** أدوار الخطوات المستنية في المجموعة الحالية */
  roles: string[]
  since: string | null
  people: ApiWaitingPerson[]
  /** اللي الخطوة مستنياهم ومش مكتوبين: زيادة عن الحد، أو أسماءهم مش ظاهرة لك */
  more: number
}

const roleName = (role: string, roleLabels: Record<string, string>) => roleLabels[role] ?? 'جهة اعتماد'

/** «أحمد بالنيابة عن سارة» للخطوة اللي عند بديل، وإلا الاسم */
export const waitingPersonName = (person: ApiWaitingPerson): string =>
  person.onBehalfOfName === undefined ? person.name : person.onBehalfOfName ? `${person.name} بالنيابة عن ${person.onBehalfOfName}` : `${person.name} بالنيابة (تفويض)`

/** المسمى، أو اسم دور الخطوة لو المسمى مش ظاهر */
export const waitingPersonTitle = (person: ApiWaitingPerson, roleLabels: Record<string, string>): string => person.jobTitle || roleName(person.role, roleLabels)

/** «من 3 يوم (2026-10-09)» — فاضي لو مفيش وقت. الأيام بفرق التاريخين (نفس التاريخ المكتوب)، مش بعدد الساعات */
export function waitingSinceText(since: string | null | undefined, now: number = Date.now()): string {
  const at = since ? Date.parse(since) : NaN
  if (Number.isNaN(at)) return ''
  const days = Math.max(0, Math.floor(now / 86_400_000) - Math.floor(at / 86_400_000))
  return `${days === 0 ? 'من النهارده' : days === 1 ? 'من امبارح' : `من ${days} يوم`} (${new Date(at).toISOString().slice(0, 10)})`
}

/** أسماء اللي خطوة الدور ده مستنياهم — للخطوة الحالية في سلسلة الاعتماد */
export const waitingNamesOfRole = (waitingAt: ApiRequestWaitingAt | null | undefined, role: string): string =>
  (waitingAt?.people ?? []).filter(person => person.role === role).map(waitingPersonName).join('، ')

/** لما مفيش اسم يتكتب: الخطوة مالهاش حد، أو اسمه مش ظاهر للحساب ده */
export const waitingNobodyText = (waitingAt: ApiRequestWaitingAt, roleLabels: Record<string, string>): string => {
  const roles = waitingAt.roles.map(role => roleName(role, roleLabels)).join('، ') || 'جهة اعتماد'
  return waitingAt.more > 0 ? `${roles} — الاسم مش ظاهر لحسابك` : `${roles} — مفيش حساب عليه الخطوة دي دلوقتي`
}

/** السطر كله نص: «واقف عند: أحمد علي — مدير مالي — من 3 يوم (2026-10-09)»؛ ولأكتر من واحد «أحمد (مدير مالي)، منى (الموارد البشرية) +2» */
export function waitingAtText(waitingAt: ApiRequestWaitingAt | null | undefined, roleLabels: Record<string, string>, now: number = Date.now()): string {
  if (!waitingAt) return ''
  const since = waitingSinceText(waitingAt.since, now)
  const people = waitingAt.people
  const who = !people.length ? waitingNobodyText(waitingAt, roleLabels)
    : people.length === 1 ? `${waitingPersonName(people[0])} — ${waitingPersonTitle(people[0], roleLabels)}`
    : people.map(person => `${waitingPersonName(person)} (${waitingPersonTitle(person, roleLabels)})`).join('، ')
  return `واقف عند: ${who}${people.length && waitingAt.more > 0 ? ` +${waitingAt.more}` : ''}${since ? ` — ${since}` : ''}`
}
