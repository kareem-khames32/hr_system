// B6.2 (أ): لغة عرض الواجهة. العربي هو الأصل: النص العربي في الكود هو المفتاح، والقاموس الإنجليزي (`src/i18n/en.ts`) بيترجمه — نص مالوش ترجمة
// بيظهر عربي. اللغة تفضيل لكل حساب (الخادم: `/auth/language`) ونسخة منها في المتصفح عشان أول رسم ييجي بالاتجاه الصح. تفضيل عرض بس.
import { useSyncExternalStore } from 'react'
import { EN } from '@/i18n/en'

export type Lang = 'ar' | 'en'
export const LANGS: ReadonlyArray<{ code: Lang; label: string }> = [{ code: 'ar', label: 'العربية' }, { code: 'en', label: 'الإنجليزية' }]
export const isLang = (value: unknown): value is Lang => value === 'ar' || value === 'en'
export const dirOf = (lang: Lang): 'rtl' | 'ltr' => (lang === 'en' ? 'ltr' : 'rtl')

const STORAGE_KEY = 'hr_lang'
let current: Lang = 'ar'
const listeners = new Set<() => void>()

/** ترجمة نص عربي للغة المطلوبة — من غير ترجمة بيرجع النص زي ما هو */
export function translate(text: string, lang: Lang = current): string {
  return lang === 'en' ? EN[text] ?? text : text
}

/** اللغة والاتجاه على `<html>` (الصفحة كلها بتتبع الاتجاه) */
function applyToDocument(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  document.documentElement.dir = dirOf(lang)
}

export const getLang = (): Lang => current

/** بيغيّر لغة العرض في الصفحة دي (ويحفظ نسخة في المتصفح) — الحفظ على الحساب في الخادم نداء منفصل */
export function setLang(lang: Lang) {
  current = lang
  try { window.localStorage.setItem(STORAGE_KEY, lang) } catch { /* تخزين المتصفح مش متاح: اللغة بتفضل للصفحة دي */ }
  applyToDocument(lang)
  listeners.forEach(listener => listener())
}

/** أول ما الإطار يركب: اللغة المحفوظة في المتصفح (لو فيه) لحد ما الخادم يرد بلغة الحساب */
export function initLang() {
  let stored: unknown = null
  try { stored = window.localStorage.getItem(STORAGE_KEY) } catch { /* من غير تخزين: عربي */ }
  if (isLang(stored) && stored !== current) setLang(stored)
  else applyToDocument(current)
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
/** لغة العرض الحالية — المكوّن بيترسم تاني لما تتغيّر */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => 'ar' as Lang)
}
/** دالة الترجمة باللغة الحالية */
export function useT(): (text: string) => string {
  const lang = useLang()
  return (text: string) => translate(text, lang)
}

/**
 * B6.2 (ج): حقل ثنائي اللغة (اسم الموظف، الفرع، القسم، نوع الإجازة…) — الاسم الإنجليزي لو اللغة إنجليزي وهو مكتوب، وغير كده الاسم العربي.
 * مفيش ترجمة آلية للأسماء: الفاضي بيرجع للعربي.
 */
export function localName(lang: Lang, arabic: string | null | undefined, english: string | null | undefined): string {
  const en = typeof english === 'string' ? english.trim() : ''
  return lang === 'en' && en ? en : arabic ?? ''
}
