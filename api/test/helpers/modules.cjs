'use strict'
// مساعد الاختبارات لنظام الموديولات (خطة التنفيذ B0.5): يفتح ويقفل موديول أو ميزة فرعية في قاعدة الاختبار المؤقتة ويمسح كاش الخدمة.
// الكتابة مباشرة في الجدول (من غير فحص التبعيات) عشان الاختبار يحط الحالة اللي عايزها بالظبط؛ الفحوص نفسها مختبرة في
// modules-enforcement وmodules-settings. الاستخدام:
//   const { moduleTools } = require('./helpers/modules.cjs')
//   const modules = moduleTools(app)            // بعد NestFactory.create
//   await modules.disable('recruitment'); … ; await modules.reset()
const { ModulesService } = require('../../src/modules-registry/modules.service')
const registry = require('../../src/modules-registry/registry')

function moduleTools(app) {
  const service = app.get(ModulesService)
  const ds = app.get(require('../../node_modules/typeorm').DataSource)
  const set = async (key, enabled, audience = null) => {
    if (!registry.isModuleKey(key)) throw new Error(`موديول مش مسجّل: ${key}`)
    await ds.getRepository('SystemModule').save({ key, enabled, enabledAt: null, enabledBy: null, audience: audience ? JSON.stringify(audience) : null })
    service.invalidate()
  }
  return {
    service,
    enable: (key, audience) => set(key, true, audience),
    disable: key => set(key, false),
    feature: async (key, enabled) => {
      if (!registry.isFeatureKey(key)) throw new Error(`ميزة مش مسجّلة: ${key}`)
      await ds.getRepository('SystemModuleFeature').save({ key, enabled, updatedAt: null, updatedBy: null })
      service.invalidate()
    },
    /** يرجّع كل حاجة لافتراضي السجل (من غير صفوف) */
    reset: async () => {
      for (const name of ['SystemModule', 'SystemModuleFeature', 'SystemModuleEvent']) await ds.getRepository(name).clear()
      service.invalidate()
    },
  }
}

module.exports = { moduleTools }
