// B2.8: التعليقات والإشارات على الطلب والمهمة (حوار مكتوب على الموضوع نفسه).
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch, uploadFile } from './api'

export type CommentKind = 'requests' | 'tasks'

/** كاتب التعليق قدام القارئ ده: الاسم لو مسموح له يشوفه، وإلا من غير اسم. subject = صاحب الطلب نفسه */
export interface CommentAuthor { name: string | null; subject: boolean }
export interface CommentTarget { key: string; label: string }
export interface ApiComment {
  /** مرجع التعليق (مش رقمه): للرد عليه */
  ref: string
  body: string
  /** داخلي: مابيظهرش لصاحب الطلب */
  internal: boolean
  createdAt: string
  /** تعليق الحساب ده */
  mine: boolean
  author: CommentAuthor
  mentions: { targets: CommentTarget[]; replies: Array<{ ref: string; mine: boolean; author: CommentAuthor }> }
  files: Array<{ id: number; name: string; size: number }>
}
export interface ApiCommentThread {
  /** false قبل ترحيل 093: مفيش حوار ولا خانة كتابة */
  available: boolean
  comments: ApiComment[]
  /** أدوار الموضوع اللي الحساب يقدر يشاور لها دلوقتي */
  targets: CommentTarget[]
  canInternal: boolean
  /** الحوار أطول من المعروض (آخر 200 تعليق) */
  truncated: boolean
}
export interface CommentInput { body: string; internal?: boolean; targets?: string[]; replyTo?: string[]; fileIds?: number[] }

export const COMMENT_BODY_MAX = 2000
export const COMMENT_FILES_MAX = 3
export const COMMENT_REPLIES_MAX = 5

export const fetchComments = (kind: CommentKind, id: number) => apiFetch<ApiCommentThread>(`/${kind}/${id}/comments`)
export const addComment = (kind: CommentKind, id: number, input: CommentInput) =>
  apiFetch<ApiComment>(`/${kind}/${id}/comments`, { method: 'POST', body: JSON.stringify(input) })
/** مرفق التعليق بيترفع الأول من غير رقم، وبيتربط بتعليقه وقت كتابته */
export const uploadCommentFile = (file: File) => uploadFile(file, { entityType: 'comment' })

/** اسم الكاتب في الحوار: «أنت» لتعليقك، والاسم لو ظاهر لك، وإلا وصف عام من غير اسم */
export const commentAuthorLabel = (kind: CommentKind, mine: boolean, author: CommentAuthor): string =>
  mine ? 'أنت' : author.name ? author.name : kind === 'requests' ? 'أحد أطراف الطلب' : 'أحد أطراف المهمة'
