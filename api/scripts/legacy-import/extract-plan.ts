// ===== خطة الاستخراج =====
// من مجلد api:
//   npx ts-node --transpile-only scripts/legacy-import/extract-plan.ts [--bundle=<extract-in-page.js>]
//
// يكتب <MIGRATION_DIR>/extract-plan.json: كل SOURCES من كل وحدات المجالات، بلا تكرار مفاتيح (تعريفان مختلفان لنفس المفتاح = خطأ)،
// ومرتبة بحيث يأتي كل مصدر each بعد مصدره (each.from).
// مع --bundle: يكتب أيضًا <MIGRATION_DIR>/extract-bundle.js = `var PLAN = …;` + سكربت الصفحة، جاهز للصق في صفحة النظام القديم.

import * as fs from 'fs'
import * as path from 'path'
import { EXTRACT_PLAN_FILE, MIGRATION_DIR, discoverDomains, sanitizeError, sourcesManifest } from './framework'

function main(argv: string[]): number {
  const modules = discoverDomains()
  const sources = sourcesManifest(modules)
  const plan = {
    generatedAt: new Date().toISOString(),
    domains: modules.map((m) => m.DOMAIN).sort(),
    count: sources.length,
    sources,
  }
  fs.mkdirSync(MIGRATION_DIR, { recursive: true })
  const tmp = `${EXTRACT_PLAN_FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(plan, null, 1))
  fs.renameSync(tmp, EXTRACT_PLAN_FILE)

  const kinds = {
    list: sources.filter((s) => !s.each && s.paginated).length,
    single: sources.filter((s) => !s.each && !s.paginated).length,
    each: sources.filter((s) => s.each && !s.binary).length,
    binary: sources.filter((s) => s.binary).length,
  }
  console.log(`مصادر: ${sources.length} (قوائم ${kinds.list}، مفردة ${kinds.single}، لكل معرّف ${kinds.each}، ملفات ${kinds.binary}) من ${modules.length} مجال → ${EXTRACT_PLAN_FILE}`)

  const bundleArg = argv.find((a) => a.startsWith('--bundle='))
  if (bundleArg) {
    const script = fs.readFileSync(path.resolve(bundleArg.slice('--bundle='.length)), 'utf8')
    const target = path.join(MIGRATION_DIR, 'extract-bundle.js')
    fs.writeFileSync(target, `var PLAN = ${JSON.stringify(plan)};\n${script}`)
    console.log(`الحزمة: ${target}`)
  }
  return 0
}

try {
  process.exit(main(process.argv.slice(2)))
} catch (err) {
  console.error(`فشل بناء الخطة — ${sanitizeError(err)}`)
  process.exit(1)
}
