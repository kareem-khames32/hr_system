// ===== تشغيل استيراد النظام القديم =====
// من مجلد api:
//   npx ts-node --transpile-only scripts/legacy-import/run.ts [--dry-run] [--only a,b] [--fresh] [--no-transaction]
//
// - المجالات بترتيب DEPENDS_ON، ومعاملة لكل مجال (فشل مجال يتراجع عنه ويتخطى ما يعتمد عليه).
// - الحفظ: idmap.json + report.json/report.md في LEGACY_MIGRATION_DIR (افتراضيًا D:/projects/migration)،
//   وraw من MIGRATION_RAW_DIR إن وُجد وإلا <MIGRATION_DIR>/raw.
// - --dry-run: كل المجالات في معاملة واحدة تُتراجع في النهاية (نقطة حفظ لكل مجال)، الملفات المرفوعة لمجلد مؤقت يُحذف،
//   عدّادات IDENTITY تُعاد، والتقرير إلى report.dry-run.* — idmap.json لا يُلمس.
// - المطبوع أعداد فقط (أنواع السجلات والتنبيهات)، بلا معرّفات أو بيانات شخصية.

import { discoverDomains, runImport, sanitizeError, type ImportResult } from './framework'

function parseArgs(argv: string[]) {
  const flags = new Set<string>()
  let only: string[] | undefined
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--only' || a.startsWith('--only=')) {
      const value = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[++i] ?? ''
      only = [...(only ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)]
    } else if (a.startsWith('--')) flags.add(a.slice(2))
    else throw new Error(`وسيط غير معروف: ${a}`)
  }
  const known = new Set(['dry-run', 'fresh', 'no-transaction', 'help'])
  for (const f of flags) if (!known.has(f)) throw new Error(`خيار غير معروف: --${f}`)
  return { only, dryRun: flags.has('dry-run'), fresh: flags.has('fresh'), transaction: !flags.has('no-transaction'), help: flags.has('help') }
}

const STATUS: Record<string, string> = { ok: 'تم', failed: 'فشل', skipped: 'تُخطّي' }

function printSummary(result: ImportResult) {
  console.log('')
  console.log(result.dryRun ? '===== ملخص التشغيل التجريبي (تم التراجع عن كل شيء) =====' : '===== ملخص الاستيراد =====')
  for (const name of result.ordered) {
    const d = result.domains[name]
    if (!d) continue
    const counts = Object.entries(d.counts).sort((a, b) => a[0].localeCompare(b[0]))
    const flags = Object.entries(d.flags).map(([k, rows]) => [k, rows.length] as const).sort((a, b) => a[0].localeCompare(b[0]))
    const total = (xs: ReadonlyArray<readonly [string, number]>) => xs.reduce((s, [, n]) => s + n, 0)
    console.log(`\n[${name}] ${STATUS[d.status] ?? d.status} — سجلات ${total(counts)}، تنبيهات ${total(flags)}، ${(d.durationMs / 1000).toFixed(1)}ث`)
    if (d.error) console.log(`  الخطأ: ${d.error}`)
    if (counts.length) console.log(`  الأعداد: ${counts.map(([k, n]) => `${k}=${n}`).join(', ')}`)
    if (flags.length) console.log(`  التنبيهات: ${flags.map(([k, n]) => `${k}=${n}`).join(', ')}`)
  }
  if (result.dryRun) {
    console.log(`\nملفات رُفعت لمجلد مؤقت ثم حُذفت: ${result.dryRunUploads ?? 0}`)
    if (result.identities) console.log(`عدّادات IDENTITY أُعيدت: ${result.identities.restored}${result.identities.failed ? ` (تعذر ${result.identities.failed})` : ''}`)
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log('npx ts-node --transpile-only scripts/legacy-import/run.ts [--dry-run] [--only a,b] [--fresh] [--no-transaction]')
    return 0
  }
  const modules = discoverDomains()
  const result = await runImport(modules, { only: args.only, dryRun: args.dryRun, fresh: args.fresh, transaction: args.transaction })
  printSummary(result)
  return result.ordered.some((name) => result.domains[name]?.status !== 'ok') ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`فشل الاستيراد — ${sanitizeError(err)}`)
    process.exit(1)
  },
)
