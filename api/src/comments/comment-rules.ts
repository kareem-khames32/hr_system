import { BadRequestException, Logger } from '@nestjs/common'
import { createHmac, randomBytes } from 'node:crypto'
import type { EntityManager } from 'typeorm'

// B2.8: قواعد التعليقات — جاهزية الجدول، وأدوار الإشارة لكل كيان، وشكل الإشارات المخزّنة، وتنضيف المدخل.
// حق القراءة والكتابة مش هنا: هو حق الكيان نفسه (CommentsService.access).

export const COMMENTS_MIGRATION_MISSING = 'التعليقات محتاجة ترحيل 20261006_093 على قاعدة البيانات'
export const COMMENTS_CONFIDENTIAL = 'حوار الطلب السري لأطرافه بس'
export const COMMENT_BODY_MAX = 2000
export const COMMENT_FILES_MAX = 3
export const COMMENT_REPLIES_MAX = 5
/** أقصى عدد تعليقات بيرجع في الحوار (الأحدث) */
export const COMMENT_THREAD_MAX = 200

export const COMMENT_ENTITY_TYPES = ['request', 'task'] as const
export type CommentEntityType = (typeof COMMENT_ENTITY_TYPES)[number]
export const isCommentEntity = (value: unknown): value is CommentEntityType => (COMMENT_ENTITY_TYPES as readonly unknown[]).includes(value)

/** أدوار الموضوع اللي ينفع الإشارة ليها. مين بالظبط بيتحسب وقت توزيع الإشعار (NotificationsService) */
export const COMMENT_TARGETS: Record<CommentEntityType, Record<string, string>> = {
  request: { REQUESTER: 'صاحب الطلب', CURRENT_APPROVERS: 'المعتمد الحالي' },
  task: { ASSIGNEE: 'المسؤول عن المهمة', CREATOR: 'اللي كلّف بالمهمة' },
}
export const commentTargetLabel = (entityType: CommentEntityType, key: string): string | null =>
  Object.prototype.hasOwnProperty.call(COMMENT_TARGETS[entityType], key) ? COMMENT_TARGETS[entityType][key] : null

let refSecret: Buffer | null = null

/**
 * مرجع التعليق في الردود والواجهة: مش رقمه. رقم التعليق من عدّاد واحد لكل الحوارات، فرقمين ورا بعض في حوار كانوا هيقولوا لصاحب الطلب
 * إن فيه تعليق (داخلي) بينهم. المرجع HMAC بمفتاح الخادم (نفس أسلوب مفتاح بنود المسير): ثابت للتعليق، ومايتخمّنش منه رقم ولا ترتيب.
 */
export function commentRef(id: number): string {
  if (!refSecret) refSecret = createHmac('sha256', process.env.JWT_SECRET || randomBytes(32)).update('hr-system/comment-ref/v1').digest()
  return createHmac('sha256', refSecret).update(String(id), 'utf8').digest('hex').slice(0, 20)
}
const COMMENT_REF = /^[a-f0-9]{20}$/

const logger = new Logger('Comments')
let ready: boolean | null = null, warned = false

/** جدول التعليقات موجود (ترحيل 093)؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء، فعملية شغالة من قبل
 * الترحيل بتشوفه أول ما يتطبق (نفس قاعدة باقي فحوصات الترحيل، CRP2N). */
export async function commentsTableReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.comments', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(COMMENTS_MIGRATION_MISSING + ' — الطلبات والمهام شغالين من غير حوار لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجدول */
export function resetCommentsTableCache() { ready = null; warned = false }

export interface CommentMentions { targets: string[]; replyTo: number[] }

/** الإشارات المخزّنة — أي شكل غير متوقع = من غير إشارات */
export function parseCommentMentions(raw: string | null | undefined): CommentMentions {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null
    const { targets, replyTo } = value as { targets?: unknown; replyTo?: unknown }
    return {
      targets: Array.isArray(targets) ? targets.filter((item): item is string => typeof item === 'string') : [],
      replyTo: Array.isArray(replyTo) ? replyTo.filter((item): item is number => Number.isSafeInteger(item) && item > 0) : [],
    }
  } catch { return { targets: [], replyTo: [] } }
}

export const storedCommentMentions = (mentions: CommentMentions): string | null =>
  mentions.targets.length || mentions.replyTo.length ? JSON.stringify({ targets: mentions.targets, replyTo: mentions.replyTo }) : null

export interface CommentInput { body?: unknown; internal?: unknown; targets?: unknown; replyTo?: unknown; fileIds?: unknown }
/** replyTo هنا مراجع (commentRef) زي ما العميل بعتها — الخدمة بتحوّلها لأرقام تعليقات من نفس الحوار */
export interface CleanComment { body: string; internal: boolean; targets: string[]; replyTo: string[]; fileIds: number[] }

const idList = (raw: unknown, max: number, label: string): number[] => {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.some(item => !Number.isSafeInteger(item) || item < 1 || item > 2147483647)) throw new BadRequestException(`${label} غير صالحة`)
  const unique = [...new Set(raw as number[])]
  if (unique.length > max) throw new BadRequestException(`${label}: بحد أقصى ${max}`)
  return unique
}

/** مدخل تعليق جديد: نص غير فاضي بحده، وإشارات من أدوار الكيان ده بس، وأرقام تعليقات ومرفقات صالحة ومن غير تكرار */
export function cleanComment(entityType: CommentEntityType, raw: CommentInput): CleanComment {
  const body = typeof raw.body === 'string' ? raw.body.replace(/\r\n/g, '\n').trim() : ''
  if (!body) throw new BadRequestException('اكتب نص التعليق')
  if (body.length > COMMENT_BODY_MAX) throw new BadRequestException(`التعليق بحد أقصى ${COMMENT_BODY_MAX} حرف`)
  if (raw.internal !== undefined && typeof raw.internal !== 'boolean') throw new BadRequestException('قيمة «داخلي» غير صالحة')
  const targets = raw.targets === undefined || raw.targets === null ? [] : raw.targets
  if (!Array.isArray(targets) || targets.some(item => typeof item !== 'string' || commentTargetLabel(entityType, item) === null)) {
    throw new BadRequestException('إشارة غير معروفة على الموضوع ده')
  }
  const replies = raw.replyTo === undefined || raw.replyTo === null ? [] : raw.replyTo
  if (!Array.isArray(replies) || replies.some(item => typeof item !== 'string' || !COMMENT_REF.test(item))) throw new BadRequestException('التعليقات المردود عليها غير صالحة')
  const replyTo = [...new Set(replies as string[])]
  if (replyTo.length > COMMENT_REPLIES_MAX) throw new BadRequestException(`التعليقات المردود عليها: بحد أقصى ${COMMENT_REPLIES_MAX}`)
  return { body, internal: raw.internal === true, targets: [...new Set(targets as string[])], replyTo, fileIds: idList(raw.fileIds, COMMENT_FILES_MAX, 'المرفقات') }
}
