// B-ADD.16: كاش البريد في ذاكرة الصفحة بس (التبويب ده): الرسالة اللي اتفتحت بتظهر تاني فورًا، والمجلد بيعرض آخر قايمة وهو بيتحدّث،
// والوقوف على صف بيحمّله مسبقًا. مفيش حاجة من البريد بتتكتب على جهاز الموظف — التخزين المشفّر على القرص اللي في المصدر مااتنقلش في النسخة دي.
import { fetchMailMessage, fetchMailThread, patchMailMessage, type MailMessage, type MailThreadMessage } from '@/lib/mail-api'

export const messageCache = new Map<string, MailMessage>()
export const threadCache = new Map<string, MailThreadMessage[]>()
export const listCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

/** الكاش بتاع مين (علامة الجلسة): دخول تاني في نفس التبويب، أو قفل البريد، مايشوفش بريد اللي قبله */
let cacheOwner: string | null = null
export function ownCaches(owner: string | null) {
  if (cacheOwner === owner) return
  messageCache.clear()
  threadCache.clear()
  listCache.clear()
  inflight.clear()
  cacheOwner = owner
}

function remember<K, V>(cache: Map<K, V>, key: K, value: V, max: number) {
  cache.set(key, value)
  if (cache.size > max) cache.delete(cache.keys().next().value as K)
}

/** رسالة: من الذاكرة، وإلا من خادم البريد (وبتتحفظ). الجلب مابيعلّمهاش مقروءة (peek) — فتحها هو اللي بيعلّمها (markOpened) */
export function fetchMessage(id: string, mbx = ''): Promise<MailMessage> {
  const hit = messageCache.get(id)
  if (hit) return Promise.resolve(hit)
  const key = `m|${mbx}|${id}`
  let pending = inflight.get(key) as Promise<MailMessage> | undefined
  if (!pending) {
    const owner = cacheOwner
    pending = fetchMailMessage(id, mbx)
      .then((message) => {
        if (owner === cacheOwner) remember(messageCache, id, message, 200)
        return message
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }
  return pending
}

/** الموظف فتح رسالة مش مقروءة: بتتعلّم مقروءة على خادم البريد (من غير إشعار قراءة) */
export function markOpened(id: string, mbx = '') {
  void patchMailMessage(id, { isRead: true }, mbx).catch(() => undefined)
}

export const threadKey = (id: string, folder: string, mbx: string) => `${mbx}/${folder}|${id}`

export function fetchThread(id: string, folder: string, mbx = ''): Promise<MailThreadMessage[]> {
  const key = threadKey(id, folder, mbx)
  const hit = threadCache.get(key)
  if (hit) return Promise.resolve(hit)
  let pending = inflight.get(`t|${key}`) as Promise<MailThreadMessage[]> | undefined
  if (!pending) {
    const owner = cacheOwner
    pending = fetchMailThread(id, folder, mbx)
      .then((list) => {
        if (owner === cacheOwner) remember(threadCache, key, list, 100)
        return list
      })
      .finally(() => inflight.delete(`t|${key}`))
    inflight.set(`t|${key}`, pending)
  }
  return pending
}

/** بعد تغيير (مقروء، نقل، حذف): المرة الجاية بتسأل خادم البريد تاني */
export function dropThread(id: string) {
  for (const key of threadCache.keys()) if (key.endsWith(`|${id}`)) threadCache.delete(key)
}
