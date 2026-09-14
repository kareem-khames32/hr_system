import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { configSeed } from '../seed/requests-seed.data'

// مفاتيح إعدادات المحرك (configSeed) الناقصة تُضاف بقيمتها الافتراضية عند الإقلاع —
// كانت تُضاف بـ npm run seed فقط، فالمفتاح الجديد لا يظهر في الإعدادات ولا يقبله
// PATCH /settings/config («غير معروف»). القيمة الموجودة لا تُلمس أبداً
@Injectable()
export class ConfigDefaultsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConfigDefaultsService.name)

  constructor(
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>
  ) {}

  async onApplicationBootstrap() {
    try {
      const existing = new Set(
        (
          await this.config.find({ where: { key: In(configSeed.map((c) => c.key)) } })
        ).map((r) => r.key)
      )
      const added: string[] = []
      for (const c of configSeed.filter((s) => !existing.has(s.key))) {
        try {
          // insert لا save: لا يكتب فوق قيمة أُضيفت بالتوازي
          await this.config.insert({ key: c.key, value: c.value })
          added.push(c.key)
        } catch (e) {
          this.logger.warn(`تعذر إضافة مفتاح الإعداد ${c.key}: ${(e as Error).message}`)
        }
      }
      if (added.length > 0) {
        this.logger.log(`أُضيفت مفاتيح إعدادات بقيمتها الافتراضية: ${added.join(', ')}`)
      }
    } catch (e) {
      // لا يمنع الإقلاع — المفتاح الناقص يعمل بقيمته الاحتياطية في الكود
      this.logger.warn(`تعذر استكمال مفاتيح الإعدادات الافتراضية: ${(e as Error).message}`)
    }
  }
}
