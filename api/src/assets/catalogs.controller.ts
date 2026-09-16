import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import type { ObjectLiteral } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import {
  assertCompanyWideWrite,
  branchScopeOf,
  CurrentUser,
  JwtAuthGuard,
  Perm,
  RolesGuard,
  userHasPerm,
} from '../auth/guards'
import { AttendancePunch, PermissionType } from '../attendance/attendance.entities'
import { AttendanceService } from '../attendance/attendance.service'
import { assertDefinitionBranchUnchanged, assertDefinitionWritable, definitionBranchForCreate, definitionBranchQuery,
  definitionBranchWhere, definitionInBranch } from '../common/definition-branch'
import { AttendanceRuleVersion } from '../attendance/attendance-rule.entities'
import { assertCalendarScope, beginCalendarChange, finishCalendarChange } from '../attendance/attendance-calendar-history'
import { appendAttendanceRuleVersion, assertAttendanceRulePeriodOpen, attendanceRuleChange,
  attendanceRuleChangeEnd, attendanceRuleDate, attendanceRuleToday, attendanceSourceEmployees, attendanceSourceSnapshot,
  employeeAttendanceFallback, lockAttendanceRuleMutation, resolveAttendanceRule, saveEmployeeAttendanceRule,
  validateAttendanceFlexSource } from '../attendance/attendance-rule-history'
import { Branch } from '../org/entities/branch.entity'
import { Employee } from '../employees/employee.entity'
import {
  AssetType,
  BiometricDevice,
  CostCenter,
  DocType,
  Grade,
  JobTitle,
  PublicHoliday,
  Shift,
  WorkSchedule,
} from './assets.entities'
import { DOC_TYPE_CODE_RE } from './doc-types'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { commKeyNumber, ZkTcpError } from '../attendance/zk-tcp-adapter'

// قراءة الكتالوجات الحساسة بصلاحية (يكفي امتلاك أيٍّ منها) — الباقي مفتوح لأي
// مستخدم لأن شاشات الخدمة الذاتية تحتاجه (العطلات، أنواع الإذن، الورديات...)
const READ_PERMS: Record<string, string[]> = {
  devices: ['attendance.sync', 'attendance.view_all', 'settings.manage'],
  grades: ['settings.manage', 'payroll.view', 'employees.view', 'employees.create', 'employees.edit'],
  'cost-centers': ['settings.manage', 'payroll.view', 'employees.view', 'employees.create', 'employees.edit'],
}

// الحقول القابلة للكتابة لكل كتالوج (قائمة بيضاء للإنشاء والتعديل): أي مفتاح آخر
// (id، lastSyncAt، lastStatus...) يُتجاهل فلا mass assignment. nullable = العمود يقبل NULL
type FieldType = 'str' | 'int' | 'num' | 'bool' | 'time' | 'date'
interface FieldSpec {
  type: FieldType
  label: string
  max?: number
  nullable?: boolean
}
const fld = (
  type: FieldType,
  label: string,
  opts: { max?: number; nullable?: boolean } = {}
): FieldSpec => ({ type, label, ...opts })

const WRITABLE: Record<string, Record<string, FieldSpec>> = {
  holidays: {
    name: fld('str', 'اسم العطلة', { max: 200 }),
    date: fld('date', 'تاريخ العطلة'),
    endDate: fld('date', 'تاريخ نهاية العطلة', { nullable: true }),
    country: fld('str', 'الدولة', { max: 5 }),
  },
  shifts: {
    name: fld('str', 'اسم الوردية', { max: 100 }),
    startTime: fld('time', 'بداية الوردية'),
    endTime: fld('time', 'نهاية الوردية'),
    shiftMode: fld('str', 'نوع الوردية', { max: 10 }),
    flexEnabled: fld('bool', 'تفعيل المرونة', { nullable: true }),
    flexWindowMinutes: fld('int', 'نافذة المرونة بالدقائق', { nullable: true }),
    requiredWorkMinutes: fld('int', 'دقائق العمل المطلوبة', { nullable: true }),
    requiredHours: fld('num', 'ساعات العمل المطلوبة', { nullable: true }),
    graceMinutes: fld('int', 'سماحية التأخير', { nullable: true }),
    overtimeThresholdHours: fld('num', 'عتبة الأوفرتايم', { nullable: true }),
    checkinFrom: fld('time', 'بداية نافذة الدخول', { nullable: true }),
    checkinTo: fld('time', 'نهاية نافذة الدخول', { nullable: true }),
    checkoutFrom: fld('time', 'بداية نافذة الخروج', { nullable: true }),
    checkoutTo: fld('time', 'نهاية نافذة الخروج', { nullable: true }),
    isActive: fld('bool', 'الحالة'),
  },
  devices: {
    name: fld('str', 'اسم الجهاز', { max: 100 }),
    serialNumber: fld('str', 'السيريال', { max: 50 }),
    branchId: fld('int', 'فرع الجهاز'),
    ip: fld('str', 'عنوان IP', { max: 50, nullable: true }),
    port: fld('int', 'المنفذ'),
    authKey: fld('str', 'مفتاح الجهاز', { max: 6, nullable: true }),
    isActive: fld('bool', 'الحالة'),
  },
  'job-titles': {
    title: fld('str', 'المسمى الوظيفي', { max: 200 }),
    titleEn: fld('str', 'المسمى بالإنجليزية', { max: 200, nullable: true }),
    isActive: fld('bool', 'الحالة'),
  },
  grades: {
    name: fld('str', 'اسم الدرجة', { max: 100 }),
    minSalary: fld('num', 'الحد الأدنى للراتب', { nullable: true }),
    maxSalary: fld('num', 'الحد الأقصى للراتب', { nullable: true }),
    isActive: fld('bool', 'الحالة'),
  },
  'asset-types': {
    name: fld('str', 'اسم النوع', { max: 100 }),
    isActive: fld('bool', 'الحالة'),
  },
  // أنواع المستندات: الكود ثابت بعد الإنشاء (المستندات تشير إليه) — التعديل للاسم والحالة
  'doc-types': {
    code: fld('str', 'كود نوع المستند', { max: 50 }),
    nameAr: fld('str', 'اسم نوع المستند', { max: 200 }),
    isActive: fld('bool', 'الحالة'),
  },
  'permission-types': {
    nameAr: fld('str', 'اسم نوع الإذن', { max: 100 }),
    isDeductible: fld('bool', 'نوع الخصم'),
    maxDurationMinutes: fld('int', 'أقصى مدة للإذن', { nullable: true }),
    monthlyFreeCount: fld('int', 'كام مرة في الشهر', { nullable: true }),
    monthlyFreeMinutes: fld('int', 'الدقائق المجانية', { nullable: true }),
    deductionPct: fld('num', 'نسبة الخصم'),
    coverage: fld('str', 'نطاق التغطية', { max: 10 }),
    isActive: fld('bool', 'الحالة'),
  },
  'cost-centers': {
    code: fld('str', 'كود مركز التكلفة', { max: 50 }),
    name: fld('str', 'اسم مركز التكلفة', { max: 200 }),
    isActive: fld('bool', 'الحالة'),
  },
  'work-schedules': {
    flexEnabled: fld('bool', 'تفعيل المرونة', { nullable: true }),
    flexWindowMinutes: fld('int', 'نافذة المرونة بالدقائق', { nullable: true }),
    requiredWorkMinutes: fld('int', 'دقائق العمل المطلوبة', { nullable: true }),
    name: fld('str', 'اسم جدول العمل', { max: 100 }),
    description: fld('str', 'الوصف', { max: 200, nullable: true }),
    weekendDays: fld('str', 'أيام نهاية الأسبوع', { max: 40 }),
    startTime: fld('time', 'بداية الدوام'),
    endTime: fld('time', 'نهاية الدوام'),
    isDefault: fld('bool', 'الجدول الافتراضي'),
    isActive: fld('bool', 'الحالة'),
  },
}

// تاريخ تقويمي صحيح YYYY-MM-DD (يرفض 2026-02-31)
const isCalendarDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// مدى كل عطلة [البداية، النهاية] مرتباً ومدمجاً بلا تكرار (لإعادة الحساب والتنبيه)
const holidayRanges = (list: PublicHoliday[]): Array<[string, string]> => {
  const ranges = list
    .filter((h) => !!h?.date)
    .map((h): [string, string] => {
      const from = String(h.date).slice(0, 10)
      const to = String(h.endDate || h.date).slice(0, 10)
      return to < from ? [to, from] : [from, to]
    })
    .sort((a, b) => a[0].localeCompare(b[0]))
  const merged: Array<[string, string]> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) {
      if (r[1] > last[1]) last[1] = r[1]
    } else merged.push([r[0], r[1]])
  }
  return merged
}

// كتالوجات الإعدادات: عطلات/ورديات/أجهزة/مسميات/درجات/أنواع أصول
// CRUD موحّد بسيط — القراءة للجميع (والحساس بصلاحية) والتعديل للأدمن/HR
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalogs')
export class CatalogsController {
  private readonly logger = new Logger(CatalogsController.name)

  constructor(
    @InjectRepository(PublicHoliday)
    private readonly holidays: Repository<PublicHoliday>,
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
    @InjectRepository(BiometricDevice)
    private readonly devices: Repository<BiometricDevice>,
    @InjectRepository(JobTitle)
    private readonly jobTitles: Repository<JobTitle>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(AssetType)
    private readonly assetTypes: Repository<AssetType>,
    @InjectRepository(CostCenter)
    private readonly costCenters: Repository<CostCenter>,
    @InjectRepository(PermissionType)
    private readonly permissionTypes: Repository<PermissionType>,
    @InjectRepository(AttendancePunch)
    private readonly punches: Repository<AttendancePunch>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(WorkSchedule)
    private readonly workSchedules: Repository<WorkSchedule>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(DocType)
    private readonly docTypes: Repository<DocType>,
    private readonly attendance: AttendanceService
  ) {}

  private repoOf(kind: string): Repository<ObjectLiteral> {
    switch (kind) {
      case 'holidays':
        return this.holidays
      case 'shifts':
        return this.shifts
      case 'devices':
        return this.devices
      case 'job-titles':
        return this.jobTitles
      case 'grades':
        return this.grades
      case 'asset-types':
        return this.assetTypes
      case 'permission-types':
        return this.permissionTypes
      case 'cost-centers':
        return this.costCenters
      case 'work-schedules':
        return this.workSchedules
      case 'doc-types':
        return this.docTypes
      default:
        throw new NotFoundException('كتالوج غير معروف')
    }
  }

  @Get(':kind')
  async list(@Param('kind') kind: string, @CurrentUser() user: JwtPayload, @Query('effectiveOn') effectiveOn?: string,
    @Query('branchId') branchIdRaw?: string) {
    const repo = this.repoOf(kind)
    const perms = READ_PERMS[kind]
    if (perms && !perms.some((p) => userHasPerm(user, p))) {
      throw new ForbiddenException('لا تملك صلاحية عرض هذا الكتالوج')
    }
    // authKey الأجهزة لا يُقرأ أصلاً (select:false في الكيان)
    const scope = branchScopeOf(user)
    // الورديات وجداول العمل (قرار المالك 16 سبتمبر): حساب الفرع يرى العام + فرعه، والعام يرى الكل
    // أو (مع ?branchId=) العام + الفرع ده — لمنتقي موظف في فرع معيّن
    const definitionKind = kind === 'shifts' || kind === 'work-schedules'
    const rows = await repo.find({ where: kind === 'devices' && scope !== null ? { branchId: scope }
      : definitionKind ? definitionBranchWhere<ObjectLiteral>(user, {}, definitionBranchQuery(branchIdRaw)) : {}, order: { id: 'ASC' } })
    if (kind === 'shifts' || kind === 'work-schedules') {
      const sourceType = kind === 'shifts' ? 'SHIFT' : 'WORK_SCHEDULE'
      const date = effectiveOn === undefined ? '9999-12-31' : attendanceRuleDate(effectiveOn)
      for (let i = 0; i < rows.length; i++) {
        const resolved = await resolveAttendanceRule(repo.manager, sourceType, rows[i].id, date, rows[i])
        // الفرع ملكية للصف الحي لا جزء من إعداد الدوام المؤرخ
        rows[i] = { ...resolved.snapshot, id: rows[i].id, branchId: rows[i].branchId ?? null, attendanceRuleVersion: resolved.version,
          attendanceRuleEffectiveFrom: resolved.effectiveFrom, attendanceRuleLegacy: resolved.legacyBaseline }
      }
    }
    // نطاقات رواتب الدرجات لمن يدير الإعدادات/الرواتب فقط — غيره الاسم والحالة
    if (
      kind === 'grades' &&
      !userHasPerm(user, 'settings.manage') &&
      !userHasPerm(user, 'payroll.view')
    ) {
      return (rows as Grade[]).map((g) => ({ id: g.id, name: g.name, isActive: g.isActive }))
    }
    // الأجهزة: نُثري بآخر ظهور (آخر بصمة بالسيريال) واسم الفرع
    if (kind === 'devices') {
      const flags = rows.length ? await this.devices.createQueryBuilder('d').select('d.id', 'id')
        .addSelect("CASE WHEN d.authKey IS NOT NULL AND d.authKey <> '' AND d.authKey <> '0' THEN 1 ELSE 0 END", 'hasAuthKey')
        .where('d.id IN (:...ids)', { ids: rows.map((d) => d.id) }).getRawMany() : []
      const keyed = new Set(flags.filter((d) => Number(d.hasAuthKey) === 1).map((d) => Number(d.id)))
      const allBranches = await this.branches.find()
      const bById = new Map(allBranches.map((b) => [b.id, b.name]))
      const enriched = []
      for (const d of rows as BiometricDevice[]) {
        const last = await this.punches.findOne({
          where: { deviceSn: d.serialNumber },
          order: { punchTime: 'DESC' },
        })
        enriched.push({
          ...this.withoutSecrets(d),
          hasAuthKey: keyed.has(d.id),
          branchName: bById.get(d.branchId) ?? `#${d.branchId}`,
          lastSeen: last?.punchTime ?? null,
        })
      }
      return enriched
    }
    // جداول العمل: نُثري بعدد الموظفين الفعلي المرتبطين بكل جدول
    if (kind === 'work-schedules') {
      const out = []
      for (const ws of rows as WorkSchedule[]) {
        const employeeCount = await this.employees.count({
          where: { workScheduleId: ws.id, ...(scope !== null ? { branchId: scope } : {}) },
        })
        out.push({ ...ws, employeeCount })
      }
      return out
    }
    return rows
  }

  @Perm('settings.manage')
  @Post(':kind')
  async create(@Param('kind') kind: string, @Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    if (kind === 'shifts' || kind === 'work-schedules') return this.saveAttendanceSource(kind, null, body, user)
    if (kind === 'holidays') return this.changeHoliday(null, body, user)
    const repo = this.repoOf(kind)
    // الكتالوجات المشتركة (درجات/مسميات/أنواع أصول/أنواع أذونات/مراكز تكلفة/أنواع مستندات) مالهاش فرع = لكل الشركة:
    // حساب الفرع يشوفها بس. الأجهزة ليها فحص فرع خاص بيها تحت
    if (kind !== 'devices') assertCompanyWideWrite(user)
    const data = this.pick(kind, body)
    if (kind === 'holidays' && data.country === undefined) {
      const configured = await this.holidays.manager.findOneBy(RequestsConfig, { key: 'system.country' })
      data.country = (configured?.value ?? '').trim().toUpperCase()
    }
    this.validate(kind, data)
    if (kind === 'devices') {
      const scope = branchScopeOf(user)
      if (scope !== null && Number(data.branchId) !== scope) throw new ForbiddenException('فرع الجهاز خارج نطاقك')
      await this.assertBranch(data.branchId)
    }
    const saved = await this.saveUnique(repo, repo.create(data))
    // عطلة جديدة تسري فوراً على الأيام المحسوبة في مداها (غياب ← عطلة)
    if (kind === 'holidays') {
      await this.recomputeHolidays([saved as PublicHoliday])
      return {
        ...this.withoutSecrets(saved),
        ...(await this.payrollWarning([saved as PublicHoliday])),
      }
    }
    if (kind === 'devices') return this.deviceView(saved)
    return this.withoutSecrets(saved)
  }

  @Perm('settings.manage')
  @Patch(':kind/:id')
  async update(
    @Param('kind') kind: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload
  ) {
    if (kind === 'shifts' || kind === 'work-schedules') return this.saveAttendanceSource(kind, id, body, user)
    if (kind === 'holidays') return this.changeHoliday(id, body, user)
    const repo = this.repoOf(kind)
    if (kind !== 'devices') assertCompanyWideWrite(user)
    const row = await repo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('السجل غير موجود')
    if (kind === 'devices') {
      const scope = branchScopeOf(user)
      if (scope !== null && row.branchId !== scope) throw new NotFoundException('السجل غير موجود')
      if (scope !== null && body.branchId !== undefined && Number(body.branchId) !== scope) throw new ForbiddenException('فرع الجهاز خارج نطاقك')
    }
    // الحقول المسموحة فقط، والتحقق على الصف بعد الدمج بنفس قواعد الإنشاء
    const data = this.pick(kind, body)
    this.validate(kind, { ...row, ...data })
    if (kind === 'devices' && data.branchId !== undefined) {
      await this.assertBranch(data.branchId)
    }
    const before = kind === 'holidays' ? ({ ...row } as PublicHoliday) : null
    Object.assign(row, data)
    const saved = await this.saveUnique(repo, row)
    // تغيّر مدى/دولة العطلة: المدى القديم يعود أيام عمل (ويُجسَّد غياب من لم يبصم
    // فيه) والجديد يصير عطلة
    if (before) {
      const h = saved as PublicHoliday
      if (
        before.date !== h.date ||
        (before.endDate ?? null) !== (h.endDate ?? null) ||
        before.country !== h.country
      ) {
        await this.recomputeHolidays([h], [before])
        return { ...this.withoutSecrets(saved), ...(await this.payrollWarning([before, h])) }
      }
    }
    return kind === 'devices' ? this.deviceView(saved) : this.withoutSecrets(saved)
  }

  // الحذف للعطلات الرسمية وجداول العمل — بقية الكتالوجات مرجعية (أيام/موظفون
  // مرتبطون بها) فتُعطَّل ولا تُحذف
  @Perm('settings.manage')
  @Delete(':kind/:id')
  async remove(
    @Param('kind') kind: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Query('moveTo') moveTo?: string,
    @Body() body: Record<string, unknown> = {}
  ) {
    this.repoOf(kind)
    if (kind === 'work-schedules') return this.removeWorkSchedule(id, user, moveTo, body)
    if (kind === 'shifts') return { ...(await this.saveAttendanceSource('shifts', id, { ...body, isActive: false }, user)), deleted: false, deactivated: true }
    if (kind !== 'holidays') {
      throw new BadRequestException(
        'الحذف متاح للعطلات الرسمية وجداول العمل فقط — عطّل السجل بدلاً من حذفه'
      )
    }
    return this.changeHoliday(id, body, user, true)
  }

  private async changeHoliday(id: number | null, body: Record<string, unknown>, user: JwtPayload, remove = false) {
    const result = await this.holidays.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      await assertCalendarScope(user, 'GLOBAL', 0, em, true)
      const before = await beginCalendarChange(em, 'GLOBAL', 0, body.calendarChange, user.sub)
      const old = id === null ? null : await em.findOneBy(PublicHoliday, { id })
      if (id !== null && !old) throw new NotFoundException('العطلة غير موجودة')
      if (remove) {
        await em.delete(PublicHoliday, { id: id! })
        await finishCalendarChange(em, before, body.calendarChange, user.sub)
        return { old, saved: null }
      }
      const data = this.pick('holidays', body)
      if (id === null && data.country === undefined) {
        const configured = await em.findOneBy(RequestsConfig, { key: 'system.country' })
        data.country = (configured?.value ?? '').trim().toUpperCase()
      }
      this.validate('holidays', { ...old, ...data })
      const saved = await em.save(PublicHoliday, em.create(PublicHoliday, { ...old, ...data }))
      await finishCalendarChange(em, before, body.calendarChange, user.sub)
      return { old, saved }
    })
    const old = result.old ? [result.old] : [], next = result.saved ? [result.saved] : []
    const recompute = await this.recomputeHolidays(next, old)
    const warning = await this.payrollWarning([...old, ...next])
    return result.saved ? { ...this.withoutSecrets(result.saved), ...warning } : { deleted: true, ...recompute, ...warning }
  }

  // إسناد جدول عمل لموظفين دفعة واحدة (شاشة أيام العمل): employeeIds (فرد أو اختيار
  // متعدد) أو departmentId (نشطو القسم) أو all (كل النشطين) — داخل نطاق فرع المستخدم
  // دائماً، وهو تعديل لبيانات موظفين فيلزمه employees.edit أيضاً. يسري على الأيام التي
  // تُحسب بعده كالإسناد من نموذج الموظف (لا يعيد حساب أيام سابقة)
  @Perm('settings.manage')
  @Post('work-schedules/:id/assign')
  async assignWorkSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload
  ) {
    if (!userHasPerm(user, 'employees.edit')) {
      throw new ForbiddenException('لا تملك صلاحية تعديل بيانات الموظفين')
    }
    const b: Record<string, unknown> = body && typeof body === 'object' ? body : {}
    const modes = [b.employeeIds !== undefined, b.departmentId !== undefined, b.all === true]
    if (modes.filter(Boolean).length !== 1) {
      throw new BadRequestException('حدّد نطاق الإسناد: موظفون بعينهم أو قسم أو كل الموظفين')
    }
    const scope = branchScopeOf(user)
    const inScope = scope != null ? { branchId: scope } : {}
    let emps: Employee[] = []
    if (b.employeeIds !== undefined) {
      const ids = Array.isArray(b.employeeIds) ? [...new Set(b.employeeIds.map(Number))] : []
      if (ids.length === 0 || ids.some((n) => !Number.isInteger(n) || n <= 0)) {
        throw new BadRequestException('قائمة الموظفين غير صحيحة')
      }
      // دفعات تحت حد معاملات SQL Server (2100)
      for (let i = 0; i < ids.length; i += 1000) {
        emps.push(
          ...(await this.employees.find({
            where: { id: In(ids.slice(i, i + 1000)), ...inScope },
          }))
        )
      }
      // خارج النطاق = غير موجود (كـ GET /employees/:id) — لا إسناد جزئي صامت
      if (emps.length !== ids.length) {
        throw new NotFoundException('موظف أو أكثر من المختارين غير موجود')
      }
    } else if (b.departmentId !== undefined) {
      const departmentId = Number(b.departmentId)
      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        throw new BadRequestException('القسم غير صحيح')
      }
      emps = await this.employees.find({ where: { departmentId, isActive: true, ...inScope } })
    } else {
      emps = await this.employees.find({ where: { isActive: true, ...inScope } })
    }
    // جدول خاص بفرع يتسند لموظفي فرعه بس (قرار المالك 16 سبتمبر): اختيار صريح لموظف من فرع تاني يترفض،
    // والإسناد لقسم أو للكل يقتصر على موظفي فرع الجدول
    const schedule = await this.workSchedules.findOneBy({ id })
    if (!schedule || !definitionInBranch(schedule.branchId, scope ?? schedule.branchId)) {
      throw new NotFoundException('جدول العمل غير موجود')
    }
    if (schedule.branchId != null) {
      if (b.employeeIds !== undefined && emps.some((e) => e.branchId !== schedule.branchId)) {
        throw new BadRequestException('جدول العمل ده خاص بفرع واحد، وفيه موظفين مختارين من فرع تاني')
      }
      emps = emps.filter((e) => e.branchId === schedule.branchId)
    }
    if (emps.length === 0) {
      throw new BadRequestException('لا يوجد موظفون نشطون مطابقون ضمن نطاقك')
    }
    const meta = attendanceRuleChange(b)
    let assigned = 0
    await this.employees.manager.transaction(async m => {
      await lockAttendanceRuleMutation(m, emps.map(employee => employee.id))
      for (const employee of emps) {
        const fresh = await m.findOneBy(Employee, { id: employee.id })
        if (!fresh || (scope !== null && fresh.branchId !== scope)) throw new NotFoundException('الموظف غير موجود')
        const version = await saveEmployeeAttendanceRule(m, fresh, { workScheduleId: id, ...meta, actorUserId: user.sub })
        if (version) { await m.save(Employee, fresh); assigned++ }
      }
    })
    return {
      scheduleId: id,
      matched: emps.length,
      assigned,
      unchanged: emps.length - assigned,
    }
  }

  // حذف جدول عمل: الافتراضي لا يُحذف، وموظفوه (والمؤرشفون منهم — مرجعهم باقٍ) يُنقلون
  // أولاً في نفس المعاملة إلى جدول نشط يحدده moveTo، وإلا يُرفض الحذف بعددهم. النقل
  // تعديل لبيانات موظفين: employees.edit وكلهم داخل نطاق فرع المستخدم
  private async removeWorkSchedule(id: number, user: JwtPayload, moveTo?: string, body: Record<string, unknown> = {}) {
    if (branchScopeOf(user) === -1) throw new ForbiddenException('حسابك مش مربوط بفرع، فمينفعش تعدّل تعريفات الدوام')
    const meta = attendanceRuleChange(body)
    return this.workSchedules.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const ws = await em.findOneBy(WorkSchedule, { id })
      if (!ws) throw new NotFoundException('جدول العمل غير موجود')
      // جدول الشركة يتعطل من حساب عام؛ حساب الفرع يعطّل جداول فرعه بس (قرار المالك 16 سبتمبر)
      assertDefinitionWritable(user, ws)
      const active = await resolveAttendanceRule(em, 'WORK_SCHEDULE', id, meta.effectiveFrom, ws)
      if (active.snapshot.isDefault) throw new BadRequestException('الجدول الافتراضي لا يُعطّل؛ اختر جدولًا افتراضيًا آخر أولًا')
      const assigned: Employee[] = []
      for (const employee of await em.find(Employee)) {
        const rule = await resolveAttendanceRule(em, 'EMPLOYEE', employee.id, meta.effectiveFrom, employeeAttendanceFallback(employee))
        if (rule.snapshot.workScheduleId === id || employee.workScheduleId === id) assigned.push(employee)
      }
      const targetId = Number(moveTo)
      if (assigned.length && (!Number.isSafeInteger(targetId) || targetId < 1 || targetId === id)) {
        throw new BadRequestException(`الجدول مُسنَد إلى ${assigned.length} موظف؛ حدّد جدول النقل قبل تعطيله`)
      }
      if (assigned.length && !userHasPerm(user, 'employees.edit')) throw new ForbiddenException('نقل موظفي الجدول يحتاج صلاحية تعديل الموظفين')
      for (const employee of assigned) {
        await saveEmployeeAttendanceRule(em, employee, { workScheduleId: targetId, ...meta, actorUserId: user.sub })
        await em.save(Employee, employee)
      }
      await this.saveAttendanceSourceInTransaction(em, 'work-schedules', id, { ...body, isActive: false }, user)
      return { deleted: false, deactivated: true, moved: assigned.length, movedTo: assigned.length ? targetId : null }
    })
  }

  // يأخذ الحقول المسموحة للكتالوج فقط ويتحقق من أنواعها (رسائل عربية).
  // غير المُرسل يبقى كما هو؛ null/'' لعمود لا يقبل NULL = غير مُرسل (يبقى الحالي/الافتراضي)
  private pick(kind: string, body: Record<string, unknown>): Record<string, unknown> {
    const spec = WRITABLE[kind] ?? {}
    const src: Record<string, unknown> = body && typeof body === 'object' ? body : {}
    const out: Record<string, unknown> = {}
    for (const [key, fs] of Object.entries(spec)) {
      if (!Object.prototype.hasOwnProperty.call(src, key)) continue
      let v = src[key]
      if (typeof v === 'string') v = v.trim()
      if (v === undefined) continue
      // Empty password means keep the existing value. Only explicit null clears it.
      if (kind === 'devices' && key === 'authKey') {
        if (v === '') continue
        try {
          const keyNumber = commKeyNumber(v)
          out[key] = keyNumber === 0 ? null : String(keyNumber)
        } catch (error) {
          throw new BadRequestException(error instanceof ZkTcpError ? error.message : 'مفتاح الاتصال غير صحيح')
        }
        continue
      }
      // النص الفارغ لعمود نصي غير nullable قيمة مقصودة (weekendDays='' = دوام 7 أيام)
      if (v === null || (v === '' && (fs.type !== 'str' || fs.nullable))) {
        if (fs.nullable) out[key] = null
        continue
      }
      out[key] = this.coerce(fs, v)
    }
    // رمز الدولة بحروف كبيرة (للمطابقة مع دولة الفرع)
    if (kind === 'holidays' && typeof out.country === 'string') {
      out.country = out.country.toUpperCase()
    }
    return out
  }

  private coerce(fs: FieldSpec, v: unknown): unknown {
    const bad = (hint: string) => new BadRequestException(`${fs.label}: ${hint}`)
    switch (fs.type) {
      case 'str':
        if (typeof v !== 'string') throw bad('قيمة نصية مطلوبة')
        if (fs.max && v.length > fs.max) throw bad(`الحد الأقصى ${fs.max} حرفاً`)
        return v
      case 'int':
      case 'num': {
        const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
        if (fs.type === 'int' ? !Number.isInteger(n) : !Number.isFinite(n)) {
          throw bad(fs.type === 'int' ? 'عدد صحيح مطلوب' : 'رقم مطلوب')
        }
        return n
      }
      case 'bool':
        if (typeof v !== 'boolean') throw bad('القيمة true أو false')
        return v
      case 'time':
        if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) {
          throw bad('بصيغة HH:mm (وقت صحيح)')
        }
        return v
      case 'date':
        if (typeof v !== 'string' || !isCalendarDate(v)) {
          throw bad('تاريخ صحيح بصيغة YYYY-MM-DD')
        }
        return v
    }
  }

  // حفظ مع ترجمة قيود التفرد من القاعدة لرسالة مفهومة
  private async saveUnique(repo: Repository<ObjectLiteral>, entity: ObjectLiteral) {
    try {
      return await repo.save(entity)
    } catch (e: any) {
      if (String(e.message).includes('duplicate') || e.number === 2601 || e.number === 2627) {
        throw new BadRequestException('القيمة مكررة — الاسم/الكود مستخدم بالفعل')
      }
      if (repo.metadata.target === BiometricDevice) {
        throw new BadRequestException('تعذر حفظ إعدادات الجهاز — تحقق من القيم ثم أعد المحاولة')
      }
      throw e
    }
  }

  // سرّ الجهاز لا يعود في أي رد
  private withoutSecrets(row: ObjectLiteral) {
    const out = { ...row }
    delete out.authKey
    return out
  }

  private async deviceView(row: ObjectLiteral) {
    const flag = await this.devices.createQueryBuilder('d').select('d.id', 'id')
      .where('d.id = :id', { id: row.id })
      .andWhere("d.authKey IS NOT NULL AND d.authKey <> '' AND d.authKey <> '0'").getRawOne()
    return { ...this.withoutSecrets(row), hasAuthKey: !!flag }
  }

  private async assertBranch(branchId: unknown) {
    const branch = await this.branches.findOne({ where: { id: Number(branchId) } })
    if (!branch) throw new BadRequestException('فرع الجهاز غير موجود')
  }

  // إعادة حساب أيام الحضور المحسوبة داخل مدى العطلات (مدمجاً بلا تكرار). removed =
  // مدى لم يعد عطلة (عطلة محذوفة، أو مداها/دولتها قبل التعديل): يُجسَّد فيه أيضاً
  // غياب من لم يبصم — التجسيد تخطاه وهو عطلة فلا صف له، فكان يبقى فارغاً حتى المسير.
  // أفضل جهد: الفشل لا يُفشل حفظ العطلة لكنه يُسجَّل
  private async recomputeHolidays(list: PublicHoliday[], removed: PublicHoliday[] = []) {
    let recomputed = 0
    let materialized = 0
    for (const [from, to] of holidayRanges([...list, ...removed])) {
      try {
        const r = await this.attendance.recomputeDateRange(from, to)
        recomputed += r.recomputed
        if (r.failed) this.logger.warn(`تعذر إعادة حساب ${r.failed} يوماً للفترة ${from}..${to}`)
      } catch (e) {
        this.logger.warn(`تعذر إعادة حساب الحضور للفترة ${from}..${to}: ${(e as Error).message}`)
      }
    }
    for (const [from, to] of holidayRanges(removed)) {
      try {
        const m = await this.attendance.materializeFormerHolidays(from, to)
        materialized += m.created
        if (m.failed) this.logger.warn(`تعذر تجسيد غياب ${m.failed} موظفاً للفترة ${from}..${to}`)
      } catch (e) {
        this.logger.warn(`تعذر تجسيد الغياب للفترة ${from}..${to}: ${(e as Error).message}`)
      }
    }
    return { recomputed, materialized }
  }

  // تنبيه لا منع: مدى العطلة يقع في فترة مسير رواتب قائم — حضور الفترة تغيّر بعد
  // حساب المسير فيلزم إعادة احتسابه (والمعتمد/المصروف يُراجع). قراءة فقط من payroll_runs
  private async payrollWarning(list: PublicHoliday[]): Promise<{ warning?: string }> {
    const label: Record<string, string> = { CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف' }
    const found = new Set<string>()
    try {
      for (const [from, to] of holidayRanges(list)) {
        const runs: Array<{ period: string; status: string }> = await this.holidays.query(
          'SELECT DISTINCT period, status FROM payroll_runs WHERE startDate <= @0 AND endDate >= @1',
          [to, from]
        )
        for (const r of runs) found.add(`${r.period} ${label[r.status] ?? r.status}`)
      }
    } catch (e) {
      this.logger.warn(`تعذر فحص فترات المسيرات للعطلة: ${(e as Error).message}`)
    }
    if (!found.size) return {}
    return {
      warning: `العطلة تقع داخل فترة مسير رواتب قائم (${[...found].sort().join('، ')}) — أعد احتساب المسير ليعكس الحضور الجديد`,
    }
  }

  private async saveAttendanceSource(kind: 'shifts' | 'work-schedules', id: number | null,
    body: Record<string, unknown>, user: JwtPayload) {
    // حساب الفرع يضيف ويعدّل تعريفات فرعه بس (قرار المالك 16 سبتمبر) — الفحص جوه المعاملة على الصف نفسه
    if (branchScopeOf(user) === -1) throw new ForbiddenException('حسابك مش مربوط بفرع، فمينفعش تعدّل تعريفات الدوام')
    return this.shifts.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      return this.saveAttendanceSourceInTransaction(em, kind, id, body, user)
    })
  }

  private async saveAttendanceSourceInTransaction(em: EntityManager, kind: 'shifts' | 'work-schedules', id: number | null,
    body: Record<string, unknown>, user: JwtPayload) {
    const repo: Repository<ObjectLiteral> = em.getRepository(kind === 'shifts' ? Shift : WorkSchedule)
    const sourceType = kind === 'shifts' ? 'SHIFT' : 'WORK_SCHEDULE'
    const row = id === null ? null : await repo.findOneBy({ id })
    if (id !== null && !row) throw new NotFoundException('تعريف الدوام غير موجود')
    if (row) {
      assertDefinitionWritable(user, row)
      assertDefinitionBranchUnchanged(row, body.branchId)
    }
    const branchId: number | null = row ? (row.branchId ?? null) : await definitionBranchForCreate(em, user, body.branchId)
    const data = this.pick(kind, body)
    const financialChange = !row || Object.keys(data).some(key => !['name', 'description'].includes(key) && data[key] !== row[key])
    const meta = attendanceRuleChange({ effectiveFrom: body.effectiveFrom ?? (!financialChange ? attendanceRuleToday() : undefined),
      changeReason: body.changeReason ?? (!financialChange ? 'تعديل اسم أو وصف تعريف الدوام' : undefined) }, !row)
    const resolved = row ? await resolveAttendanceRule(em, sourceType, row.id, meta.effectiveFrom, row) : null
    const defaults = kind === 'shifts' ? { shiftMode: 'fixed', isActive: true } : {
      startTime: '08:00', endTime: '17:00', weekendDays: 'FRI,SAT', isActive: true, isDefault: false,
    }
    const before = row ? await attendanceSourceSnapshot(em, row) : null
    const base = resolved?.snapshot ?? { ...defaults, flexEnabled: false }
    const snapshot = await attendanceSourceSnapshot(em, { ...base, ...data,
      ...(financialChange ? { flexPolicy: undefined } : {}) })
    if (!row && data.shiftMode === 'flexible' && data.flexEnabled === undefined) snapshot.flexEnabled = true
    this.validate(kind, snapshot)
    // الجدول الافتراضي بيتطبق على كل موظف ملوش جدول في كل الفروع، فمايبقاش خاص بفرع
    if (kind === 'work-schedules' && branchId !== null && snapshot.isDefault) {
      throw new BadRequestException('الجدول الافتراضي لازم يكون لكل الشركة، مش لفرع واحد')
    }
    if (financialChange) {
      validateAttendanceFlexSource(snapshot)
      const employees = row ? await attendanceSourceEmployees(em, sourceType, row.id, before, snapshot)
        : snapshot.isDefault ? (await em.find(Employee, { select: { id: true } })).map(employee => employee.id) : []
      await assertAttendanceRulePeriodOpen(em, employees, meta.effectiveFrom,
        row ? await attendanceRuleChangeEnd(em, sourceType, row.id, meta.effectiveFrom) : '9999-12-31')
      for (const employeeId of employees) {
        const employee = await em.findOneBy(Employee, { id: employeeId })
        if (!employee) continue
        const employeeRule = await resolveAttendanceRule(em, 'EMPLOYEE', employee.id, meta.effectiveFrom, employeeAttendanceFallback(employee))
        if (employeeRule.snapshot.flexOverrideMode === 'ENABLED') validateAttendanceFlexSource(snapshot, true)
      }
    }
    // التبديل الافتراضي مؤرخ في كل تعريف داخل المعاملة نفسها؛ لا تحديث صامت للتاريخ.
    if (kind === 'work-schedules' && snapshot.isDefault && financialChange) {
      const through = row ? await attendanceRuleChangeEnd(em, sourceType, row.id, meta.effectiveFrom) : '9999-12-31'
      const planned = (await em.find(AttendanceRuleVersion, { where: { sourceType: 'WORK_SCHEDULE' } }))
        .filter(version => version.sourceId !== id && version.effectiveFrom && version.effectiveFrom > meta.effectiveFrom
          && version.effectiveFrom <= through && version.snapshot.isDefault && version.snapshot.isActive)
      if (planned.length) {
        throw new BadRequestException('يوجد تغيير افتراضي مستقبلي داخل مدة هذا التعديل؛ راجع تاريخ التغيير المخطط قبل حفظ جدول افتراضي متعارض')
      }
      for (const other of await em.find(WorkSchedule)) {
        if (other.id === id) continue
        const active = await resolveAttendanceRule(em, 'WORK_SCHEDULE', other.id, meta.effectiveFrom, other)
        if (!active.snapshot.isDefault) continue
        const otherSnapshot = await attendanceSourceSnapshot(em, { ...active.snapshot, isDefault: false })
        await appendAttendanceRuleVersion(em, { sourceType: 'WORK_SCHEDULE', sourceId: other.id,
          before: await attendanceSourceSnapshot(em, other), snapshot: otherSnapshot,
          effectiveFrom: meta.effectiveFrom, reason: `نقل الجدول الافتراضي — ${meta.reason}`.slice(0, 500), actorUserId: user.sub })
        const latest = await resolveAttendanceRule(em, 'WORK_SCHEDULE', other.id, '9999-12-31', other)
        await em.save(WorkSchedule, Object.assign(other, this.pick(kind, { ...latest.snapshot })))
      }
    }
    const saved = row ?? await this.saveUnique(repo, repo.create({ ...this.pick(kind, snapshot), branchId }))
    snapshot.id = saved.id
    const version = await appendAttendanceRuleVersion(em, { sourceType, sourceId: saved.id, before,
      snapshot, effectiveFrom: meta.effectiveFrom, reason: meta.reason, actorUserId: user.sub })
    const latest = await resolveAttendanceRule(em, sourceType, saved.id, '9999-12-31', snapshot)
    await this.saveUnique(repo, Object.assign(saved, this.pick(kind, latest.snapshot)))
    return { ...snapshot, attendanceRuleVersion: version.version, attendanceRuleVersionId: version.id,
      attendanceRuleEffectiveFrom: version.effectiveFrom }
  }

  // تحقق الحد الأدنى لكل كتالوج — رسائل عربية
  private validate(kind: string, b: Record<string, unknown>) {
    const need = (field: string, label: string) => {
      if (b[field] === undefined || b[field] === null || b[field] === '') {
        throw new BadRequestException(`${label} مطلوب`)
      }
    }
    const time = (field: string, label: string) => {
      if (b[field] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b[field]))) {
        throw new BadRequestException(`${label} بصيغة HH:mm (وقت صحيح)`)
      }
    }
    // مدى رقمي مسموح (إن وُجدت القيمة)
    const range = (field: string, label: string, min: number, max: number) => {
      if (b[field] === undefined || b[field] === null || b[field] === '') return
      const n = Number(b[field])
      if (!Number.isFinite(n) || n < min || n > max) {
        throw new BadRequestException(`${label} بين ${min} و${max}`)
      }
    }
    switch (kind) {
      case 'holidays':
        need('name', 'اسم العطلة')
        need('date', 'تاريخ العطلة')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) {
          throw new BadRequestException('تاريخ العطلة بصيغة YYYY-MM-DD')
        }
        // عطلة ممتدة: النهاية لا تسبق البداية
        if (b.endDate && String(b.endDate) < String(b.date)) {
          throw new BadRequestException('تاريخ نهاية العطلة لا يسبق تاريخ بدايتها')
        }
        if (b.country && !/^[A-Za-z]{2,5}$/.test(String(b.country))) {
          throw new BadRequestException('رمز الدولة حروف إنجليزية (مثل EG أو SA)')
        }
        break
      case 'shifts':
        need('name', 'اسم الوردية')
        need('startTime', 'بداية الوردية')
        need('endTime', 'نهاية الوردية')
        time('startTime', 'بداية الوردية')
        time('endTime', 'نهاية الوردية')
        // نوافذ البصمة (اختيارية) — بصيغة وقت صحيحة إن وُجدت
        time('checkinFrom', 'بداية نافذة الدخول')
        time('checkinTo', 'نهاية نافذة الدخول')
        time('checkoutFrom', 'بداية نافذة الخروج')
        time('checkoutTo', 'نهاية نافذة الخروج')
        if (
          b.shiftMode != null &&
          !['fixed', 'flexible'].includes(String(b.shiftMode))
        ) {
          throw new BadRequestException('نوع الوردية: fixed أو flexible')
        }
        range('requiredHours', 'ساعات العمل المطلوبة', 0.5, 24)
        range('graceMinutes', 'سماحية التأخير (دقيقة)', 0, 240)
        range('overtimeThresholdHours', 'عتبة الأوفرتايم (ساعة)', 0, 24)
        break
      case 'devices':
        need('name', 'اسم الجهاز')
        need('serialNumber', 'السيريال')
        need('branchId', 'فرع الجهاز')
        range('port', 'المنفذ', 1, 65535)
        break
      case 'job-titles':
        need('title', 'المسمى الوظيفي')
        break
      case 'grades': {
        need('name', 'اسم الدرجة')
        // SET-18: نطاق راتب صحيح — غير سالب، والحد الأدنى لا يتجاوز الأقصى (درجة
        // 15,000–8,000 كانت تُحفظ). على الصف بعد الدمج فيُفحص تعديل أحد الطرفين أيضاً
        const salary = (f: string) =>
          b[f] === undefined || b[f] === null || b[f] === '' ? null : Number(b[f])
        const lo = salary('minSalary')
        const hi = salary('maxSalary')
        if ((lo !== null && lo < 0) || (hi !== null && hi < 0)) {
          throw new BadRequestException('حدود راتب الدرجة لا تكون سالبة')
        }
        if (lo !== null && hi !== null && lo > hi) {
          throw new BadRequestException('الحد الأدنى للراتب لا يتجاوز الحد الأقصى')
        }
        break
      }
      case 'asset-types':
        need('name', 'اسم النوع')
        break
      case 'permission-types':
        need('nameAr', 'اسم نوع الإذن')
        if (
          b.coverage != null &&
          !['morning', 'evening', 'both'].includes(String(b.coverage))
        ) {
          throw new BadRequestException('نطاق التغطية: morning/evening/both')
        }
        range('maxDurationMinutes', 'أقصى مدة للإذن (دقيقة)', 1, 1440)
        range('monthlyFreeCount', 'كام مرة في الشهر', 0, 1000)
        range('monthlyFreeMinutes', 'الدقائق المجانية شهرياً', 0, 100000)
        range('deductionPct', 'نسبة الخصم', 0, 100)
        break
      case 'cost-centers':
        need('name', 'اسم مركز التكلفة')
        need('code', 'كود مركز التكلفة')
        break
      case 'work-schedules':
        need('name', 'اسم جدول العمل')
        time('startTime', 'بداية الدوام')
        time('endTime', 'نهاية الدوام')
        if (
          b.weekendDays &&
          !/^([A-Z]{3})(,[A-Z]{3})*$/.test(String(b.weekendDays))
        ) {
          throw new BadRequestException(
            'أيام نهاية الأسبوع رموز مفصولة بفاصلة (مثل FRI,SAT)'
          )
        }
        // رموز أيام حقيقية بلا تكرار، ويبقى يوم دوام واحد على الأقل
        if (b.weekendDays) {
          const codes = String(b.weekendDays).split(',')
          const week = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
          if (codes.some((c) => !week.includes(c)) || new Set(codes).size !== codes.length) {
            throw new BadRequestException(
              'أيام نهاية الأسبوع من الرموز SUN/MON/TUE/WED/THU/FRI/SAT بلا تكرار'
            )
          }
          if (codes.length === week.length) {
            throw new BadRequestException('جدول العمل يحتاج يوم دوام واحداً على الأقل')
          }
        }
        // الافتراضي المعطَّل لا يُطبَّق، وحفظه يُسقط العلم عن غيره فيبقى كل من بلا
        // جدول «بلا وردية» — يُمنع صراحةً
        if (b.isDefault === true && b.isActive === false) {
          throw new BadRequestException(
            'الجدول الافتراضي لا يُعطَّل — اجعل جدولاً آخر افتراضياً أولاً'
          )
        }
        break
    }
  }
}
