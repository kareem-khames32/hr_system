import { apiFetch } from './api'

// التأمينات الاجتماعية (السعودية / المصرية): إعدادات الشركة ونظام كل فرع وتقرير الشهر
export type InsuranceSystem = 'NONE' | 'SAUDI' | 'EGYPTIAN'
export const INSURANCE_SYSTEM_LABELS: Record<InsuranceSystem, string> = { NONE: 'بدون تأمينات', SAUDI: 'التأمينات السعودية', EGYPTIAN: 'التأمينات المصرية' }
export const INSURANCE_CATEGORY_LABELS: Record<string, string> = { SAUDI: 'سعودي', NON_SAUDI: 'غير سعودي', EGYPTIAN: 'مصري' }

export interface SocialInsuranceSettings {
  saudiEmployeePct: number; saudiEmployerPct: number; nonSaudiEmployeePct: number; nonSaudiEmployerPct: number
  saudiMinSalary: number; saudiMaxSalary: number
  egyptianEmployeePct: number; egyptianEmployerPct: number; egyptianMinSalary: number; egyptianMaxSalary: number
}
export interface SocialInsuranceSettingsView {
  settings: SocialInsuranceSettings
  defaults: SocialInsuranceSettings
  reviewedAt: string | null
  canEdit: boolean
  branches: Array<{ id: number; name: string; insuranceSystem: InsuranceSystem }>
}
export interface SocialInsuranceReportRow {
  employeeId: number; employeeCode: string; fullName: string; branchId: number; branchName: string | null
  nationality: string | null; gosiNumber: string | null; system: InsuranceSystem; category: string | null; salarySource: 'DECLARED' | 'BASIC' | null
  insuredSalary: number; employeePct: number; employerPct: number; employeeShare: number; employerShare: number; source: 'PAYROLL' | 'ESTIMATE'
}
export interface SocialInsuranceReport {
  period: string; branchId: number | null; rows: SocialInsuranceReportRow[]
  totals: { employees: number; insuredSalary: string; employeeShare: string; employerShare: string; total: string }
}

export const fetchSocialInsuranceSettings = () => apiFetch<SocialInsuranceSettingsView>('/social-insurance/settings')
export const saveSocialInsuranceSettings = (settings: SocialInsuranceSettings) =>
  apiFetch<SocialInsuranceSettingsView>('/social-insurance/settings', { method: 'PUT', body: JSON.stringify(settings) })
export const fetchSocialInsuranceReport = (period: string, branchId?: number | null) =>
  apiFetch<SocialInsuranceReport>(`/social-insurance/report?period=${encodeURIComponent(period)}${branchId ? `&branchId=${branchId}` : ''}`)
