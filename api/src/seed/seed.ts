// سكريبت البذر — يُنشئ الأدمن والفروع الأساسية أول مرة
// التشغيل: npm run seed (بعد ضبط .env وتشغيل SQL Server)
import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()

import { DataSource } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { User } from '../auth/user.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { Employee } from '../employees/employee.entity'

const dbType = (process.env.DB_TYPE ?? 'mssql') as 'mssql' | 'mysql'

const common = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? (dbType === 'mysql' ? '3306' : '1433'), 10),
  username: process.env.DB_USERNAME ?? (dbType === 'mysql' ? 'root' : 'sa'),
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'hr_system',
  entities: [User, Branch, Department, Team, Employee],
  synchronize: true, // البذر ينشئ الجداول لو مش موجودة
}

const ds =
  dbType === 'mysql'
    ? new DataSource({ type: 'mysql', ...common })
    : new DataSource({
        type: 'mssql',
        ...common,
        options: { trustServerCertificate: true, encrypt: false },
      })

// إنشاء القاعدة تلقائياً إن لم تكن موجودة — يوفّر خطوة CREATE DATABASE اليدوية
async function ensureDatabaseExists() {
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
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${common.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    await conn.end()
    console.log(`✓ القاعدة ${common.database} جاهزة`)
  } else {
    // mssql: اتصال بـ master لإنشائها
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
    await master.query(
      `IF DB_ID('${common.database}') IS NULL CREATE DATABASE [${common.database}]`
    )
    await master.destroy()
    console.log(`✓ القاعدة ${common.database} جاهزة`)
  }
}

async function main() {
  await ensureDatabaseExists()
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

  await ds.destroy()
  console.log('✅ البذر اكتمل')
}

main().catch((err) => {
  console.error('❌ فشل البذر:', err.message)
  process.exit(1)
})
