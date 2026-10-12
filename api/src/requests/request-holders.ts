import { inBranchScope, type BranchScope } from '../auth/guards'

// B-ADD.17 (طلب المالك 12 أكتوبر): «الطلب وقف عند مين؟» — اسم الشخص اللي الخطوة الحالية مستنياه، مش اسم الدور بس.
//  مين «مستنياه» بيتحسب من المحرك نفسه (RequestHoldersService: المعتمد المسمّى المحفوظ على الخطوة، وحكم stepAwaitsAccount بتاع الصندوق
//  والبريد لحاملي الدور الوظيفي وللبديل). هنا الجزء الصافي بس: مين من دول اسمه يظهر للقارئ ده، ومن إمتى الطلب واقف عند الخطوة.
//  اللي بيرجع اسم ومسمى بس — من غير أرقام موظفين ولا حسابات.

/** أقصى عدد أسماء في الرد؛ الباقي عدد («+N») */
export const WAITING_NAMES_MAX = 5

export interface WaitingPerson {
  name: string
  /** المسمى الحالي — لو فرع الشخص الحالي جوه نطاق القارئ بس (زي مسمى صاحب الطلب في الصندوق) */
  jobTitle: string | null
  /** دور الخطوة اللي مستنياه (كود الدور زي ما هو في resolvedSteps) */
  role: string
  /** الخطوة عنده بتفويض: اسم المفوِّض — أو null لو اسمه مش ظاهر للقارئ */
  onBehalfOfName?: string | null
}

export interface RequestWaitingAt {
  stepOrder: number
  /** أدوار الخطوات المستنية في المجموعة الحالية (أكواد resolvedSteps) — اسم الدور لما مفيش اسم يتكتب */
  roles: string[]
  /** من إمتى الطلب واقف عند الخطوة دي (ISO) */
  since: string | null
  people: WaitingPerson[]
  /** اللي الخطوة مستنياهم ومش مكتوبين: زيادة عن الحد، أو أسماءهم مش ظاهرة للقارئ */
  more: number
}

/** شخص الخطوة مستنياه: موظف بفرعه الحالي، أو حساب من غير موظف بفرع الحساب */
export interface HolderIdentity {
  /** مفتاح عدم التكرار (موظف أو حساب) — مابيرجعش في الرد */
  key: string
  employeeId: number | null
  name: string
  jobTitle: string | null
  branchId: number | null
}

/** خطوة مستنية ومين عليها بحكم المحرك */
export interface WaitingStepHolders {
  role: string
  /** خطوة هيكلية: المعتمد المسمّى المحفوظ عليها */
  named: HolderIdentity | null
  /** خطوة هيكلية: بدلاء المعتمد المسمّى اللي الخطوة في صندوقهم بتفويض ساري */
  delegates: HolderIdentity[]
  /** خطوة دور وظيفي: الحسابات اللي الخطوة في صندوقها */
  accounts: HolderIdentity[]
}

export interface HolderViewer {
  /** صاحب الطلب أو اللي قدّمه: بيشوف اسم اللي طلبه واقف عنده أيًا كان فرعه (ده الغرض) */
  requesterSide: boolean
  employeeId: number | null
  scope: BranchScope
}

/**
 * مين يتكتب للقارئ ده. صاحب الطلب (أو اللي قدّمه) بيشوف الاسم دايمًا؛ غيره (معتمد، أو صاحب «كل الطلبات») بيشوف اسم اللي فرعه الحالي
 * جوه نطاقه بس، والباقي بيتعدّ من غير اسم. المسمى بفرع الشخص الحالي جوه نطاق القارئ للكل. الشخص مرة واحدة حتى لو عليه خطوتين.
 */
export function waitingPeople(steps: readonly WaitingStepHolders[], viewer: HolderViewer): { people: WaitingPerson[]; more: number } {
  const self = (person: HolderIdentity) => person.employeeId != null && viewer.employeeId != null && person.employeeId === viewer.employeeId
  const inScope = (person: HolderIdentity) => self(person) || inBranchScope(viewer.scope, person.branchId)
  const shown = (person: HolderIdentity) => viewer.requesterSide || inScope(person)
  const people: WaitingPerson[] = []
  const seen = new Set<string>()
  let more = 0
  const add = (person: HolderIdentity, role: string, onBehalfOf?: HolderIdentity) => {
    if (seen.has(person.key)) return
    seen.add(person.key)
    people.push({ name: person.name, jobTitle: inScope(person) ? person.jobTitle : null, role,
      ...(onBehalfOf ? { onBehalfOfName: shown(onBehalfOf) ? onBehalfOf.name : null } : {}) })
  }
  // اسمه مش ظاهر للقارئ: معدود مرة واحدة من غير اسم
  const count = (person: HolderIdentity) => {
    if (seen.has(person.key)) return
    seen.add(person.key)
    more++
  }
  for (const step of steps) {
    if (step.named) {
      // البديل الظاهر بيتكتب «فلان بالنيابة عن فلان»؛ ومن غير بديل ظاهر: المعتمد المسمّى نفسه
      const delegates = step.delegates.filter(shown)
      for (const delegate of delegates) add(delegate, step.role, step.named)
      if (!delegates.length) { if (shown(step.named)) add(step.named, step.role); else count(step.named) }
    }
    for (const account of step.accounts) { if (shown(account)) add(account, step.role); else count(account) }
  }
  return { people: people.slice(0, WAITING_NAMES_MAX), more: more + Math.max(0, people.length - WAITING_NAMES_MAX) }
}

/**
 * من إمتى الطلب واقف عند خطوته الحالية — من الخطوات المحفوظة على الطلب نفسها (ساعة الخادم اللي كتبها، زي وقت التقديم): الطلب وصل
 * للمجموعة الحالية مع آخر قرار في خطوة قبلها، وإلا وقت التقديم (إعادة التقديم بتحل السلسلة من جديد وبتحدّثه). والخطوة اللي ليها مهلة
 * مهلتها بتبدأ لما توصل لصاحبها والتصعيد بيبدأها من جديد، فبدايتها = موعدها ناقص مهلتها — كده الخطوة المتصعّدة «من» وقت التصعيد.
 * لمجموعة متوازية: أقدم خطوة لسه مستنية.
 */
export function waitingSince(req: { currentStep?: number | null; submittedAt?: Date | string | null; resolvedSteps?: string | null }): string | null {
  // أوقات الخطوات المحفوظة بس (نص تالف = من غير خطوات، والطلب ساعتها مالوش خطوة مستنية أصلًا)؛ مين الخطوة مستنياه من المحرك
  let steps: Array<{ stepOrder: number; slaDays?: number | null; dueAt?: string | null; actedAt?: string | null }> = []
  try {
    const parsed: unknown = JSON.parse(req.resolvedSteps ?? '[]')
    if (Array.isArray(parsed)) steps = parsed.filter(step => step && typeof step === 'object')
  } catch { steps = [] }
  const time = (value: Date | string | null | undefined) => {
    const at = value == null ? NaN : new Date(value).getTime()
    return Number.isNaN(at) ? null : at
  }
  const current = Number(req.currentStep)
  let reached = time(req.submittedAt)
  for (const step of steps) {
    const at = Number(step.stepOrder) < current ? time(step.actedAt) : null
    if (at !== null && (reached === null || at > reached)) reached = at
  }
  let since: number | null = null
  for (const step of steps) {
    if (Number(step.stepOrder) !== current || step.actedAt) continue
    const due = time(step.dueAt)
    const sla = Number(step.slaDays)
    const started = due !== null && Number.isFinite(sla) && sla > 0 ? due - sla * 86_400_000 : null
    const at = started !== null && (reached === null || started > reached) ? started : reached
    if (at !== null && (since === null || at < since)) since = at
  }
  return since === null ? null : new Date(since).toISOString()
}
