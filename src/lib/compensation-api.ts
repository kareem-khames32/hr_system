// B5.1: «تخطيط الزيادات وسلّم الرواتب» — موديول compensation (مقفول افتراضيًا). الأرقام بصلاحية عرض الرواتب.
import { apiFetch } from './api'

export interface ApiSalaryBand { min: number; mid: number; max: number }
export type BandPosition = 'BELOW' | 'WITHIN' | 'ABOVE'
export interface ApiBandGrade { id: number; name: string; isActive: boolean; band: ApiSalaryBand | null; headcount: number; below: number; above: number }
export interface ApiBandEmployee {
  employeeId: number; fullName: string; employeeCode: string | null; gradeId: number | null; gradeName: string | null
  /** راتب المقارنة حسب الأساس (الأساسي أو الإجمالي) */
  salary: number
  /** الراتب ÷ منتصف النطاق */
  compaRatio: number | null
  position: BandPosition | null; positionLabel: string | null
}
export interface ApiSalaryBands { basis: 'BASIC' | 'GROSS'; basisLabel: string; grades: ApiBandGrade[]; employees: ApiBandEmployee[]; withoutGrade: number }

const C = '/compensation'
export const fetchSalaryBands = () => apiFetch<ApiSalaryBands>(`${C}/bands`)
