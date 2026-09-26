// رفع رواتب الفرعين من شيتات Excel — يمر بدوال النظام نفسها (سجل الأجر المؤرخ وبصمته)
//   npx ts-node --transpile-only scripts/import-salaries.ts [--apply]
// الربط بكود البصمة، والأربعة بلا بصمة بالاسم. التقسيم: 65% أساسي، 25% سكن، والباقي مواصلات.
// بدل ضغط العمل يتكتب زي ما هو من الشيت.
import 'reflect-metadata'
import * as path from 'node:path'
import { config as dotenv } from 'dotenv'
import { DataSource } from 'typeorm'
import { documentInitialEmployeeSalary, applyEmployeeSalaryChange } from '../src/payroll/payroll-salary-change'
import { readSalaryHistory, readSalaryHistoryCurrent } from '../src/payroll/payroll-salary-history'

dotenv({ path: path.join(__dirname, '..', '.env') })
const APPLY = process.argv.includes('--apply')
const SCRATCH = 'C:/Users/Kareem.khamis/AppData/Local/Temp/claude/C--Users-Kareem-khamis-Documents-hr-system/619677e4-94fc-47f7-a107-454af5f5e008/scratchpad'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readBook } = require(`${SCRATCH}/readbook.cjs`)

const num = (v: unknown) => { const s = String(v ?? '').replace(/[,\s]/g, ''); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null }
const numKey = (v: unknown) => { const s = String(v ?? '').trim(); return /^\d+$/.test(s) ? String(Number(s)) : s.toLowerCase() }
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2)

// الأربعة اللي بلا كود بصمة — بالاسم من الشيت
const BY_NAME: Record<string, string> = {
  'hq:1': 'EMP-0084', 'hq:2': 'EMP-0085', 'hq:3': 'EMP-0086', 'nsr:2': 'EMP-0353',
}

type Row = { key: string; code: string; name: string; salary: number; pressure: number }

function loadSheets(): Row[] {
  const out: Row[] = []
  const hq = readBook(`${SCRATCH}/sal_hq`)[0].rows.filter((r: any[]) => r && r.some((c) => c))
  const hHead = hq[0].map((h: any) => String(h).trim())
  const hi = (n: string) => hHead.indexOf(n)
  for (const r of hq.slice(1)) {
    const s = num(r[hi('الراتب الاساسي')])
    if (s === null || s <= 0) continue
    out.push({ key: 'hq:' + numKey(r[hi('كود')]), code: String(r[hi('كود')]).trim(), name: String(r[hi('الأسم بالعربي')]).trim(),
      salary: s, pressure: num(r[hi('بدل ضغط العمل')]) ?? 0 })
  }
  const nsr = readBook(`${SCRATCH}/sal_nsr`)[0].rows.filter((r: any[]) => r && r.some((c) => c))
  const nHead = nsr[0].map((h: any) => String(h).trim())
  const ni = (n: string) => nHead.indexOf(n)
  for (const r of nsr.slice(1)) {
    const s = num(r[ni('الراتب الصافي')])
    if (s === null || s <= 0) continue
    out.push({ key: 'nsr:' + numKey(r[ni('كود الموظف')]), code: String(r[ni('كود الموظف')]).trim(),
      name: String(r[ni('الأسم بالعربي')]).trim(), salary: s, pressure: 0 })
  }
  return out
}

const split = (total: number) => {
  const basic = Math.round(total * 0.65 * 100) / 100
  const housing = Math.round(total * 0.25 * 100) / 100
  return { basic, housing, transport: Math.round((total - basic - housing) * 100) / 100 }
}

async function main() {
  const ds = new DataSource({
    type: 'mssql', host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 1433),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    options: { trustServerCertificate: true, encrypt: false }, synchronize: false, logging: false,
    entities: [path.join(__dirname, '..', 'src', '**', '*.entity{.ts,.js}'), path.join(__dirname, '..', 'src', '**', '*.entities{.ts,.js}')],
  })
  await ds.initialize()

  const actor = (await ds.query(`SELECT TOP 1 id FROM users WHERE role='super_admin' AND isActive=1 ORDER BY id`))[0]?.id
  if (!actor) throw new Error('مفيش حساب مدير نظام مفعّل لتنفيذ التوثيق')

  const emps: Array<{ id: number; employeeCode: string; fingerprintCode: string | null; fullName: string; joinDate: string | null; br: string }> =
    await ds.query(`SELECT e.id, e.employeeCode, e.fingerprintCode, e.fullName,
      CONVERT(varchar(10), e.joinDate, 23) joinDate, b.code br
      FROM employees e LEFT JOIN branches b ON b.id = e.branchId`)
  const byFp = new Map<string, typeof emps>()
  const byCode = new Map(emps.map((e) => [e.employeeCode, e]))
  for (const e of emps) { const k = numKey(e.fingerprintCode); if (!k) continue; if (!byFp.has(k)) byFp.set(k, [] as any); byFp.get(k)!.push(e) }

  const rows = loadSheets()
  const plan: Array<{ e: typeof emps[0]; r: Row; parts: ReturnType<typeof split> }> = []
  const unmatched: Row[] = []
  for (const r of rows) {
    const fp = r.key.split(':')[1]
    let e = byFp.get(fp)?.length === 1 ? byFp.get(fp)![0] : undefined
    if (!e && BY_NAME[r.key]) e = byCode.get(BY_NAME[r.key])
    if (!e) { unmatched.push(r); continue }
    plan.push({ e, r, parts: split(r.salary) })
  }

  // من عنده سجل أجر بالفعل
  const documented = new Set<number>((await ds.query(
    `SELECT DISTINCT employeeId FROM employee_salary_history_versions`)).map((x: any) => x.employeeId))
  const fresh = plan.filter((x) => !documented.has(x.e.id))
  const resplit = plan.filter((x) => documented.has(x.e.id))

  console.log(`صفوف صالحة في الشيتات : ${rows.length}`)
  console.log(`اتطابقوا              : ${plan.length}`)
  console.log(`   توثيق أول مرة      : ${fresh.length}`)
  console.log(`   إعادة تقسيم        : ${resplit.length}`)
  console.log(`مش في النظام          : ${unmatched.length}`)
  unmatched.forEach((r) => console.log(`   ${r.code.padEnd(8)} ${r.name}`))
  console.log(`\nعينة:`)
  plan.slice(0, 3).forEach(({ e, r, parts }) =>
    console.log(`   ${e.employeeCode} ${e.fullName.slice(0, 26).padEnd(26)} ${r.salary} → ${parts.basic} / ${parts.housing} / ${parts.transport}${r.pressure ? ' + ضغط ' + r.pressure : ''}`))
  resplit.forEach(({ e, r, parts }) =>
    console.log(`   [إعادة] ${e.employeeCode} ${e.fullName.slice(0, 24).padEnd(24)} ${r.salary} → ${parts.basic} / ${parts.housing} / ${parts.transport}`))

  if (!APPLY) { console.log('\n★ معاينة فقط. للتنفيذ: --apply'); await ds.destroy(); return }

  let ok = 0
  const failed: Array<[string, string]> = []
  for (const { e, r, parts } of plan) {
    const qr = ds.createQueryRunner()
    await qr.connect(); await qr.startTransaction()
    try {
      const em = qr.manager
      // التوثيق الأول بيقرا القيم من صف الموظف، فبنكتبها الأول. أما «تغيير الأجر» فبيحدّث الصف
      // بنفسه وبيرفض لو الصف اتغير برّه السجل — فممنوع نلمسه قبله.
      if (!documented.has(e.id)) {
        await em.query(
          `UPDATE dbo.employees SET basicSalary=@1, housingAllowance=@2, transportAllowance=@3,
             phoneAllowance=0, workNatureAllowance=0, otherAllowance=0, workPressureAllowance=@4, currency='EGP'
           WHERE id=@0`,
          [e.id, money(parts.basic), money(parts.housing), money(parts.transport), money(r.pressure)])
      }
      if (documented.has(e.id)) {
        const cur = await readSalaryHistoryCurrent(em, e.id)
        const hist = await readSalaryHistory(em, e.id)
        await applyEmployeeSalaryChange(em, {
          employeeId: e.id, actorUserId: actor,
          effectivePayrollPeriod: hist.version!.periods?.[0]?.effectivePayrollPeriod ?? new Date().toISOString().slice(0, 7),
          reason: 'إعادة توزيع مكونات الأجر على 65% أساسي و25% سكن و10% مواصلات',
          evidenceReference: 'شيت رواتب الفرع — استيراد جماعي',
          expectedRevision: hist.revision, expectedCurrentSourceHash: cur!.currentSourceHash,
          salary: { basicSalary: money(parts.basic), housingAllowance: money(parts.housing), transportAllowance: money(parts.transport),
            phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00', workPressureAllowance: money(r.pressure), currency: 'EGP' } as any,
        })
      } else {
        const res = await documentInitialEmployeeSalary(em, { employeeId: e.id, actorUserId: actor, hireDate: e.joinDate,
          evidenceReference: 'شيت رواتب الفرع — استيراد جماعي' })
        if (!res.documented) throw new Error('لم يوثق — مكونات الأجر صفر')
      }
      await qr.commitTransaction(); ok++
      if (ok % 50 === 0) console.log(`   ... ${ok}`)
    } catch (err: any) {
      await qr.rollbackTransaction()
      failed.push([e.employeeCode, String(err?.response?.message ?? err?.message ?? err).slice(0, 140)])
    } finally { await qr.release() }
  }
  console.log(`\n★ اتوثّق ${ok} موظف`)
  if (failed.length) { console.log(`فشل ${failed.length}:`); failed.forEach(([c, m]) => console.log(`   ${c}: ${m}`)) }
  await ds.destroy()
}

main().catch((e) => { console.error('FAIL:', e?.message ?? e); process.exit(1) })
