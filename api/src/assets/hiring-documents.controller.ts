import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Query, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Min } from 'class-validator'
import { In, Not, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { HiringDocumentReminder } from './hiring-document-reminder.entity'
import { hiringDocumentsStatus, reminderCodesJson, requiredHiringDocTypes } from './hiring-documents'

// «ابعت تذكير» للموظفين المختارين من تقرير النواقص
class SendHiringRemindersDto {
  @IsArray({ message: 'اختار الموظفين اللي هيوصلهم التذكير' })
  @ArrayMinSize(1, { message: 'اختار موظف واحد على الأقل' })
  @ArrayMaxSize(2000, { message: 'التذكير لـ 2000 موظف بالكتير في المرة' })
  @IsInt({ each: true, message: 'أرقام الموظفين غير صحيحة' })
  @Min(1, { each: true, message: 'أرقام الموظفين غير صحيحة' })
  employeeIds: number[]
}

// الموظفين الشغالين: منتهي الخدمة والمؤرشف برّه التقرير والتذكير
const INACTIVE_STATUSES: Employee['status'][] = ['terminated', 'archived']

// البحث بالاسم أو الكود بنفس تسامح بحث الموظفين في الشاشات (src/lib/employee-search.ts): الهمزات والتاء المربوطة والألف
// المقصورة والتشكيل والأرقام العربية، والكلمات بأي ترتيب، والكود من غير شرطات («emp007» = «EMP-007»)
const normalizeSearch = (value: unknown) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[؜​-‏‪-‮⁦-⁩﻿]/g, '')
  .replace(/[̀-ͯؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[آأإٱ-ٳ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/[ىیئ]/g, 'ي')
  .replace(/ؤ/g, 'و')
  .replace(/ک/g, 'ك')
  .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim()
const compactOf = (value: string) => value.replace(/[\s\-_.\/\\]+/g, '')
export function hiringSearchMatcher(query: unknown): (employee: Pick<Employee, 'fullName' | 'fullNameEn' | 'employeeCode'>) => boolean {
  const text = normalizeSearch(query)
  if (!text) return () => true
  const tokens = text.split(' '), compact = compactOf(text)
  return employee => {
    const fields = [employee.fullName, employee.fullNameEn, employee.employeeCode].map(normalizeSearch).filter(Boolean)
    return tokens.every(token => fields.join(' ').includes(token)) || (!!compact && fields.map(compactOf).join(' ').includes(compact))
  }
}

// «مسوغات التعيين» (طلب المالك 30 سبتمبر): تقرير الناقص عند كل موظف وتذكيره، و«المطلوب منّي» للموظف نفسه.
// التقرير والتذكير لمدير مستندات الموظفين في نطاق فروعه بس — موظف برّه النطاق = غير موجود (404) من غير اسمه ولا رقمه.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hiring-documents')
export class HiringDocumentsController {
  constructor(
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(HiringDocumentReminder) private readonly reminders: Repository<HiringDocumentReminder>
  ) {}

  // الموظفين الشغالين في النطاق اللي ناقصهم مستند مطلوب أو أكتر، بالناقص وآخر تذكير. فلتر بالاسم/الكود وبالفرع
  @Perm('documents.manage')
  @Get('missing')
  async missing(@CurrentUser() user: JwtPayload, @Query('search') search?: string, @Query('branchId') branchIdRaw?: string) {
    const scope = branchScopeOf(user)
    let branchId: number | null = null
    if (branchIdRaw !== undefined && branchIdRaw !== '') {
      branchId = Number(branchIdRaw)
      if (!Number.isSafeInteger(branchId) || branchId < 1) throw new BadRequestException('الفرع المختار غير صحيح')
      if (!inBranchScope(scope, branchId)) throw new NotFoundException('الفرع غير موجود')
    }
    const manager = this.employees.manager
    const required = await requiredHiringDocTypes(manager)
    if (!required.length) return { required, employees: [] }
    const matches = hiringSearchMatcher(search)
    const employees = (await this.employees.find({
      select: { id: true, employeeCode: true, fullName: true, fullNameEn: true, branchId: true, departmentId: true },
      where: {
        status: Not(In(INACTIVE_STATUSES)),
        ...(branchId !== null ? { branchId } : scope !== null ? { branchId: branchIdIn(scope) } : {}),
      },
    })).filter(matches)
    const status = await hiringDocumentsStatus(manager, employees.map(employee => employee.id), required)
    const incomplete = employees.filter(employee => (status.get(employee.id)?.missing.length ?? 0) > 0)
    if (!incomplete.length) return { required, employees: [] }

    const ids = incomplete.map(employee => employee.id)
    const lastReminder = new Map<number, Date>()
    for (let i = 0; i < ids.length; i += 1000) {
      const rows: Array<{ employeeId: number; sentAt: Date }> = await this.reminders.createQueryBuilder('r')
        .select('r.employeeId', 'employeeId').addSelect('MAX(r.sentAt)', 'sentAt')
        .where('r.employeeId IN (:...ids)', { ids: ids.slice(i, i + 1000) })
        .groupBy('r.employeeId').getRawMany()
      for (const row of rows) lastReminder.set(Number(row.employeeId), row.sentAt)
    }
    const branchIds = [...new Set(incomplete.map(employee => employee.branchId).filter(id => id != null))]
    const departmentIds = [...new Set(incomplete.map(employee => employee.departmentId).filter(id => id != null))]
    const branchName = new Map((branchIds.length ? await this.branches.find({ select: { id: true, name: true }, where: { id: In(branchIds) } }) : [])
      .map(branch => [branch.id, branch.name]))
    const departmentName = new Map((departmentIds.length ? await this.departments.find({ select: { id: true, name: true }, where: { id: In(departmentIds) } }) : [])
      .map(department => [department.id, department.name]))
    const rows = incomplete.map(employee => {
      const own = status.get(employee.id)!
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        branchId: employee.branchId,
        branchName: branchName.get(employee.branchId) ?? null,
        departmentId: employee.departmentId ?? null,
        departmentName: employee.departmentId ? departmentName.get(employee.departmentId) ?? null : null,
        missing: own.missing,
        requiredCount: own.required.length,
        presentCount: own.present.length,
        lastReminderAt: lastReminder.get(employee.id) ?? null,
      }
    })
    rows.sort((a, b) => String(a.branchName ?? '').localeCompare(String(b.branchName ?? ''), 'ar')
      || a.fullName.localeCompare(b.fullName, 'ar') || a.employeeId - b.employeeId)
    return { required, employees: rows }
  }

  // تذكير للمختارين: كل موظف شغال في النطاق وناقصه حاجة بياخد صف تذكير واحد (وإشعار «ناقصك من مسوغات التعيين»).
  // موظف برّه النطاق أو مش موجود → 404 ومفيش ولا تذكير (لا تذكير جزئي صامت)؛ اللي مالوش ناقص بيتعدّى ويتعد
  @Perm('documents.manage')
  @Post('reminders')
  async remind(@CurrentUser() user: JwtPayload, @Body() dto: SendHiringRemindersDto) {
    const ids = [...new Set(dto.employeeIds)]
    const scope = branchScopeOf(user)
    const found: Employee[] = []
    for (let i = 0; i < ids.length; i += 1000) {
      found.push(...await this.employees.find({
        select: { id: true, status: true, branchId: true },
        where: { id: In(ids.slice(i, i + 1000)), ...(scope !== null ? { branchId: branchIdIn(scope) } : {}) },
      }))
    }
    if (found.length !== ids.length) throw new NotFoundException('موظف أو أكتر من المختارين غير موجود')
    const manager = this.employees.manager
    const active = found.filter(employee => !INACTIVE_STATUSES.includes(employee.status))
    const status = await hiringDocumentsStatus(manager, active.map(employee => employee.id))
    const sentAt = new Date()
    const rows = active.flatMap(employee => {
      const missing = status.get(employee.id)?.missing ?? []
      return missing.length ? [{ employeeId: employee.id, sentByUserId: user.sub, sentAt,
        missingDocTypes: reminderCodesJson(missing.map(type => type.code)) }] : []
    })
    const saved: Array<{ id: number; employeeId: number }> = []
    if (rows.length) {
      await manager.transaction(async em => {
        // 400 صف × 4 قيم في الدفعة: تحت حد معاملات SQL Server (2100)
        for (let i = 0; i < rows.length; i += 400) {
          const part = rows.slice(i, i + 400)
          const result = await em.insert(HiringDocumentReminder, part)
          part.forEach((row, index) => saved.push({ id: Number(result.identifiers[index]?.id), employeeId: row.employeeId }))
        }
      })
    }
    return {
      sent: saved.length,
      skipped: ids.length - saved.length,
      reminders: saved.map(reminder => ({ ...reminder, sentAt, missing: status.get(reminder.employeeId)?.missing ?? [] })),
    }
  }

  // «مسوغات التعيين المطلوبة منك» — للموظف نفسه (أي حساب مربوط بموظف): كل نوع مطلوب وهل مرفوع ولا ناقص
  @Get('mine')
  async mine(@CurrentUser() user: JwtPayload) {
    const employeeId = user.employeeId
    if (!employeeId) return { employeeLinked: false, documents: [], missingCount: 0 }
    const own = (await hiringDocumentsStatus(this.employees.manager, [employeeId])).get(employeeId)
    const present = new Set((own?.present ?? []).map(type => type.code))
    return {
      employeeLinked: true,
      documents: (own?.required ?? []).map(type => ({ ...type, present: present.has(type.code) })),
      missingCount: own?.missing.length ?? 0,
    }
  }
}
