// سكريبت البذر — يُنشئ الأدمن والفروع الأساسية أول مرة
// التشغيل: npm run seed (بعد ضبط .env وتشغيل SQL Server)
import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()

import { DataSource } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { ROLE_PRESETS } from '../auth/permissions'
import { Role, UserPermissionOverride } from '../auth/role.entity'
import { User } from '../auth/user.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { Employee } from '../employees/employee.entity'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import {
  AttendanceCorrection,
  OvertimeEntry,
} from '../requests/entities/attendance.entities'
import { Asset, CustodyAssignment } from '../requests/entities/custody.entities'
import {
  EmployeeStatusHistory,
  Promotion,
  Transfer,
} from '../requests/entities/employment.entities'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import {
  Leave,
  LeaveBalance,
  LeaveType,
} from '../requests/entities/leave.entities'
import { LetterRequest } from '../requests/entities/letter.entities'
import { RequestApproval } from '../requests/entities/request-approval.entity'
import { RequestAttachment } from '../requests/entities/request-attachment.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  AttendanceDay,
  AttendancePunch,
  PermissionType,
  ScheduleDayOverride,
  ScheduleEntry,
} from '../attendance/attendance.entities'
import {
  ClearanceItem,
  OffboardingCase,
  SettlementLine,
} from '../offboarding/offboarding.entities'
import { StoredFile } from '../files/stored-file.entity'
import { PayrollItem, PayrollRun } from '../payroll/payroll.entities'
import {
  AssetType,
  BiometricDevice,
  Candidate,
  EmployeeDocument,
  Grade,
  JobTitle,
  PublicHoliday,
  Shift,
  WorkSchedule,
} from '../assets/assets.entities'
import { ensureLeaveBalance, seedRequests } from './seed-requests'
import { seedPreflight, seedSchemaDecision } from './seed-guard'

const dbType = (process.env.DB_TYPE ?? 'mssql') as 'mssql' | 'mysql'

// الحارس قبل أي اتصال: قاعدة مؤقتة، أو تثبيت جديد بتصريح --fresh-install (والفحص الفعلي في main)
const preflight = (() => {
  try {
    return seedPreflight(process.env.DB_DATABASE, process.argv.slice(2), 'seed')
  } catch (err) {
    console.error('❌ فشل البذر:', (err as Error).message)
    return process.exit(1)
  }
})()

const common = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? (dbType === 'mysql' ? '3306' : '1433'), 10),
  username: process.env.DB_USERNAME ?? (dbType === 'mysql' ? 'root' : 'sa'),
  password: process.env.DB_PASSWORD ?? '',
  database: preflight.database,
  entities: [
    User,
    Role,
    UserPermissionOverride,
    Branch,
    Department,
    Team,
    Employee,
    // محرك الطلبات
    RequestType,
    ApprovalChain,
    ApprovalStep,
    Request,
    RequestApproval,
    RequestAttachment,
    RequestsConfig,
    // الوجهات
    LeaveType,
    Leave,
    LeaveBalance,
    OvertimeEntry,
    AttendanceCorrection,
    Loan,
    LoanInstallment,
    Transfer,
    Promotion,
    EmployeeStatusHistory,
    Asset,
    CustodyAssignment,
    LetterRequest,
    // الحضور
    AttendancePunch,
    ScheduleEntry,
    ScheduleDayOverride,
    PermissionType,
    AttendanceDay,
    // الرواتب
    PayrollRun,
    PayrollItem,
    // الملفات المخزنة
    StoredFile,
    // إنهاء الخدمة
    OffboardingCase,
    ClearanceItem,
    SettlementLine,
    // الملحقات
    EmployeeDocument,
    PublicHoliday,
    Shift,
    WorkSchedule,
    BiometricDevice,
    JobTitle,
    Grade,
    AssetType,
    Candidate,
  ],
}

// يُنشأ بعد فحص القاعدة فقط: المزامنة لقاعدة اختبار مؤقتة أو لقاعدة جديدة/فارغة (seedSchemaDecision)
let ds: DataSource
const createDataSource = (synchronize: boolean) =>
  dbType === 'mysql'
    ? new DataSource({ type: 'mysql', ...common, synchronize })
    : new DataSource({
        type: 'mssql',
        ...common,
        synchronize,
        options: { trustServerCertificate: true, encrypt: false },
      })

// فحص القاعدة ثم إنشاؤها إن لم تكن موجودة — قاعدة قائمة فيها جداول تُرفض قبل أي مزامنة
async function prepareDatabase(): Promise<boolean> {
  if (dbType === 'mysql') {
    // اتصال بدون قاعدة محددة لإنشائها
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mysql = require('mysql2/promise')
    const conn = await mysql.createConnection({
      host: common.host,
      port: common.port,
      user: common.username,
      password: common.password,
    })
    try {
      const [schemas] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.schemata WHERE schema_name = ?', [common.database])
      const [tables] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?', [common.database])
      const decision = seedSchemaDecision(preflight, { exists: Number(schemas[0].n) > 0, userTables: Number(tables[0].n) })
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${common.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )
      console.log(`✓ القاعدة ${common.database} جاهزة`)
      return decision.synchronize
    } finally {
      await conn.end()
    }
  }
  // mssql: اتصال بـ master لفحصها وإنشائها
  const master = new DataSource({
    type: 'mssql',
    host: common.host,
    port: common.port,
    username: common.username,
    password: common.password,
    database: 'master',
    options: { trustServerCertificate: true, encrypt: false },
  })
  await master.initialize()
  try {
    const [row] = await master.query('SELECT DB_ID(@0) AS id', [common.database])
    const userTables = row.id
      ? Number((await master.query(`SELECT COUNT(*) AS n FROM [${common.database}].sys.tables WHERE is_ms_shipped = 0`))[0].n)
      : 0
    const decision = seedSchemaDecision(preflight, { exists: !!row.id, userTables })
    if (!row.id) await master.query(`CREATE DATABASE [${common.database}]`)
    console.log(`✓ القاعدة ${common.database} جاهزة`)
    return decision.synchronize
  } finally {
    await master.destroy()
  }
}

async function main() {
  ds = createDataSource(await prepareDatabase())
  await ds.initialize()
  console.log(`✓ اتصال قاعدة البيانات ناجح (${dbType})`)

  const users = ds.getRepository(User)
  const branches = ds.getRepository(Branch)
  const departments = ds.getRepository(Department)
  const employees = ds.getRepository(Employee)

  // ===== الفروع =====
  let mainBranch = await branches.findOne({ where: { code: 'CAI-001' } })
  if (!mainBranch) {
    mainBranch = await branches.save(
      branches.create({
        name: 'الفرع الرئيسي - القاهرة',
        nameEn: 'Main Branch - Cairo',
        code: 'CAI-001',
        city: 'القاهرة',
        costCenter: 'CC-100',
        isHeadquarters: true,
      })
    )
    await branches.save(
      branches.create({
        name: 'فرع المعادي',
        nameEn: 'Maadi Branch',
        code: 'MAA-001',
        city: 'القاهرة',
        costCenter: 'CC-200',
      })
    )
    console.log('✓ الفروع أُنشئت')
  }

  // ===== قسم افتراضي =====
  let hrDept = await departments.findOne({ where: { code: 'HR' } })
  if (!hrDept) {
    hrDept = await departments.save(
      departments.create({
        name: 'الموارد البشرية',
        nameEn: 'Human Resources',
        code: 'HR',
        branchId: mainBranch.id,
      })
    )
    console.log('✓ قسم HR أُنشئ')
  }

  // ===== موظف الأدمن =====
  let adminEmp = await employees.findOne({ where: { employeeCode: 'EMP001' } })
  if (!adminEmp) {
    adminEmp = await employees.save(
      employees.create({
        employeeCode: 'EMP001', // نفسه كود البصمة على جهاز ZKTeco
        fullName: 'مدير النظام',
        email: 'admin@company.com',
        jobTitle: 'مدير النظام',
        branchId: mainBranch.id,
        departmentId: hrDept.id,
        status: 'active',
      })
    )
    console.log('✓ موظف الأدمن أُنشئ')
  }

  // ===== حساب الأدمن =====
  const adminEmail = 'admin@company.com'
  const existing = await users.findOne({ where: { email: adminEmail } })
  if (!existing) {
    await users.save(
      users.create({
        email: adminEmail,
        passwordHash: await bcrypt.hash('Admin@123', 10),
        displayName: 'مدير النظام',
        role: 'super_admin',
        branchId: null as unknown as number, // super_admin يرى كل الفروع
        employeeId: adminEmp.id,
      })
    )
    console.log('✓ حساب الأدمن أُنشئ:')
    console.log('  البريد: admin@company.com')
    console.log('  كلمة المرور: Admin@123  ← غيّرها فوراً')
  } else {
    console.log('• حساب الأدمن موجود بالفعل')
  }

  // ===== موظف تجريبي (مديره المباشر = الأدمن) لاختبار دورات الاعتماد =====
  let demoEmp = await employees.findOne({ where: { employeeCode: 'EMP002' } })
  if (!demoEmp) {
    demoEmp = await employees.save(
      employees.create({
        employeeCode: 'EMP002', // نفسه كود البصمة على ZKTeco
        fullName: 'موظف تجريبي',
        email: 'employee@company.com',
        jobTitle: 'أخصائي موارد بشرية',
        branchId: mainBranch.id,
        departmentId: hrDept.id,
        managerEmployeeId: adminEmp.id,
        status: 'active',
        basicSalary: 8000,
      })
    )
    console.log('✓ الموظف التجريبي أُنشئ (EMP002)')
  }
  const demoEmail = 'employee@company.com'
  if (!(await users.findOne({ where: { email: demoEmail } }))) {
    await users.save(
      users.create({
        email: demoEmail,
        passwordHash: await bcrypt.hash('Employee@123', 10),
        displayName: 'موظف تجريبي',
        role: 'employee',
        branchId: mainBranch.id,
        employeeId: demoEmp.id,
      })
    )
    console.log('✓ حساب الموظف التجريبي: employee@company.com / Employee@123')
  }

  // ===== كتالوجات الملحقات: ورديات/عطلات/مسميات/أنواع أصول =====
  const shiftsRepo = ds.getRepository(Shift)
  if ((await shiftsRepo.count()) === 0) {
    await shiftsRepo.save([
      { name: 'صباحي', startTime: '08:00', endTime: '17:00' },
      { name: 'وردية 10', startTime: '10:00', endTime: '19:00' },
      { name: 'وردية 11', startTime: '11:00', endTime: '20:00' },
      { name: 'مسائي', startTime: '14:00', endTime: '23:00' },
    ])
    console.log('✓ كتالوج الورديات')
  }
  const workSchedulesRepo = ds.getRepository(WorkSchedule)
  if ((await workSchedulesRepo.count()) === 0) {
    await workSchedulesRepo.save([
      {
        name: 'الجدول الأساسي',
        description: 'جمعة وسبت إجازة',
        weekendDays: 'FRI,SAT',
        startTime: '08:00',
        endTime: '17:00',
        isDefault: true,
      },
      {
        name: 'جدول السبت فقط',
        description: 'السبت فقط إجازة — الجمعة دوام',
        weekendDays: 'SAT',
        startTime: '08:00',
        endTime: '16:00',
        isDefault: false,
      },
    ])
    console.log('✓ جداول العمل')
  }
  const holidaysRepo = ds.getRepository(PublicHoliday)
  if ((await holidaysRepo.count()) === 0) {
    await holidaysRepo.save([
      { name: 'عيد الفطر', date: '2026-03-20', endDate: '2026-03-23', country: 'EG' },
      { name: 'شم النسيم', date: '2026-04-13', country: 'EG' },
      { name: 'عيد العمال', date: '2026-05-01', country: 'EG' },
      { name: 'عيد الأضحى', date: '2026-05-26', endDate: '2026-05-30', country: 'EG' },
      { name: 'ثورة 30 يونيو', date: '2026-06-30', country: 'EG' },
      { name: 'ثورة 23 يوليو', date: '2026-07-23', country: 'EG' },
      { name: 'عيد القوات المسلحة', date: '2026-10-06', country: 'EG' },
    ])
    console.log('✓ العطلات الرسمية (مصر 2026)')
  }
  const jobTitlesRepo = ds.getRepository(JobTitle)
  if ((await jobTitlesRepo.count()) === 0) {
    await jobTitlesRepo.save([
      { title: 'مدير النظام' },
      { title: 'أخصائي موارد بشرية' },
      { title: 'محاسب' },
      { title: 'مهندس برمجيات' },
      { title: 'مسؤول مبيعات' },
    ])
    console.log('✓ المسميات الوظيفية')
  }
  const assetTypesRepo = ds.getRepository(AssetType)
  if ((await assetTypesRepo.count()) === 0) {
    await assetTypesRepo.save([
      { name: 'لابتوب' },
      { name: 'موبايل' },
      { name: 'سيارة' },
      { name: 'كارت دخول' },
      { name: 'أدوات مكتبية' },
    ])
    console.log('✓ أنواع الأصول')
  }
  // أنواع الإذن الافتراضية (بدون خصم هو المعتاد)
  const permTypesRepo = ds.getRepository(PermissionType)
  if ((await permTypesRepo.count()) === 0) {
    await permTypesRepo.save([
      { nameAr: 'إذن شخصي (بدون خصم)', isDeductible: false, maxDurationMinutes: 180 },
      { nameAr: 'إذن رسمي/مأمورية قصيرة', isDeductible: false },
      { nameAr: 'إذن بخصم', isDeductible: true, maxDurationMinutes: 240 },
    ])
    console.log('✓ أنواع الإذن')
  }
  // ترحيل بيانات: الإجازات القديمة غير المدفوعة تتعلم isUnpaid
  await ds.query(
    `UPDATE leaves SET isUnpaid = 1 WHERE leaveTypeCode = 'UNPAID' AND isUnpaid = 0`
  )

  const gradesRepo = ds.getRepository(Grade)
  if ((await gradesRepo.count()) === 0) {
    await gradesRepo.save([
      { name: 'الدرجة الأولى', minSalary: 15000, maxSalary: 30000 },
      { name: 'الدرجة الثانية', minSalary: 9000, maxSalary: 15000 },
      { name: 'الدرجة الثالثة', minSalary: 5000, maxSalary: 9000 },
    ])
    console.log('✓ الدرجات الوظيفية')
  }

  // ===== الأدوار (حزم الصلاحيات) — إدراج الناقص فقط، لا يمس المعدَّل =====
  const rolesRepo = ds.getRepository(Role)
  for (const preset of ROLE_PRESETS) {
    const existing = await rolesRepo.findOne({ where: { code: preset.code } })
    if (!existing) {
      await rolesRepo.save(
        rolesRepo.create({
          code: preset.code,
          nameAr: preset.nameAr,
          permissions: JSON.stringify(preset.permissions),
          isSystem: preset.isSystem,
        })
      )
    } else if (existing.isSystem) {
      // مفاتيح جديدة في الـ preset تُضاف للحزمة (union) — تعديلات المستخدم تبقى
      try {
        const current: string[] = JSON.parse(existing.permissions)
        if (!current.includes('*')) {
          const merged = [...new Set([...current, ...preset.permissions])]
          if (merged.length !== current.length) {
            existing.permissions = JSON.stringify(merged)
            await rolesRepo.save(existing)
          }
        }
      } catch {
        /* حزمة تالفة — تُترك */
      }
    }
  }
  console.log('✓ الأدوار الأساسية (حزم الصلاحيات)')

  // ===== مستخدمو الاختبار — واحد لكل دور/وظيفة (لا يتكررون) =====
  const overridesRepo = ds.getRepository(UserPermissionOverride)
  const testAccounts: Array<{
    email: string
    password: string
    displayName: string
    role: string
    employeeCode: string
    jobTitle: string
    grants?: string[]
  }> = [
    {
      email: 'hr@company.com', password: 'Hr@123456',
      displayName: 'هالة مصطفى — HR', role: 'hr_manager',
      employeeCode: 'HR-001', jobTitle: 'مدير موارد بشرية',
    },
    {
      email: 'custody@company.com', password: 'Custody@123',
      displayName: 'سامي فؤاد — أمين العهدة', role: 'employee',
      employeeCode: 'CUS-001', jobTitle: 'أمين عهدة',
      grants: ['custody.assign', 'approve.custody'],
    },
    {
      email: 'accountant@company.com', password: 'Finance@123',
      displayName: 'منى حسن — محاسبة', role: 'employee',
      employeeCode: 'ACC-001', jobTitle: 'محاسبة',
      grants: ['approve.finance', 'payroll.view'],
    },
  ]
  for (const acc of testAccounts) {
    if (await users.findOne({ where: { email: acc.email } })) continue
    let emp = await employees.findOne({
      where: { employeeCode: acc.employeeCode },
    })
    if (!emp) {
      emp = await employees.save(
        employees.create({
          employeeCode: acc.employeeCode,
          fullName: acc.displayName.split(' — ')[0],
          jobTitle: acc.jobTitle,
          branchId: mainBranch.id,
          departmentId: hrDept.id,
          managerEmployeeId: adminEmp.id,
          status: 'active',
          basicSalary: 7000,
        })
      )
      await ensureLeaveBalance(ds, emp.id)
    }
    const saved = await users.save(
      users.create({
        email: acc.email,
        passwordHash: await bcrypt.hash(acc.password, 10),
        displayName: acc.displayName,
        role: acc.role as any,
        branchId: mainBranch.id,
        employeeId: emp.id,
      })
    )
    for (const g of acc.grants ?? []) {
      await overridesRepo.save(
        overridesRepo.create({ userId: saved.id, permission: g, effect: 'GRANT' })
      )
    }
    console.log(`✓ حساب اختبار: ${acc.email} / ${acc.password}`)
  }

  // ===== محرك الطلبات: السلاسل + الأنواع + الإجازات + الإعدادات =====
  await seedRequests(ds)
  await ensureLeaveBalance(ds, adminEmp.id)
  await ensureLeaveBalance(ds, demoEmp.id)
  console.log('✓ أرصدة الإجازات للسنة الحالية')

  await ds.destroy()
  console.log('✅ البذر اكتمل')
}

main().catch((err) => {
  console.error('❌ فشل البذر:', err.message)
  process.exit(1)
})
