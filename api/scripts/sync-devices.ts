// سحب أجهزة البصمة في عملية مستقلة عن سيرفر التطوير (إعادة التشغيل التلقائي مع كل حفظ كانت بتقطع السحب في النص).
// الاستخدام (من فولدر api):  npx ts-node --transpile-only scripts/sync-devices.ts 3 4 5
// بدون أرقام = كل الأجهزة الفعّالة. الجدولة (cron) بتتوقف في العملية دي عشان مايتكررش شغل السيرفر.
import { NestFactory } from '@nestjs/core'
import { SchedulerRegistry } from '@nestjs/schedule'
import { AppModule } from '../src/app.module'
import { DeviceSyncService } from '../src/attendance/device-sync.service'

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })
  try {
    const registry = app.get(SchedulerRegistry)
    for (const job of registry.getCronJobs().values()) job.stop()
    for (const name of registry.getIntervals()) registry.deleteInterval(name)
    for (const name of registry.getTimeouts()) registry.deleteTimeout(name)
  } catch { /* مفيش جدولة */ }
  const sync = app.get(DeviceSyncService)
  const ids = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n > 0)
  const results = ids.length ? [] : await sync.syncAll()
  for (const id of ids) {
    const started = Date.now()
    const r = await sync.syncDevice(id)
    results.push(r)
    console.log(JSON.stringify({ id, ok: r.ok, pulled: r.pulled, inserted: r.inserted, matched: r.matched, error: r.error ?? null, seconds: Math.round((Date.now() - started) / 1000) }))
  }
  if (!ids.length) for (const r of results) console.log(JSON.stringify({ id: r.deviceId, ok: r.ok, pulled: r.pulled, inserted: r.inserted, matched: r.matched, error: r.error ?? null }))
  await app.close()
}

main().catch((e) => { console.log('فشل:', String(e?.message ?? e).slice(0, 200)); process.exit(1) })
