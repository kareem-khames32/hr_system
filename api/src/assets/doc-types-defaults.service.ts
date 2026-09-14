import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocType } from './assets.entities'
import { DOC_TYPES_SEED } from './doc-types'

// أنواع المستندات الأساسية تُضاف للكتالوج عند الإقلاع لو ناقصة (بالكود) — نفس نمط
// ConfigDefaultsService: الموجود لا يُلمس (اسم عدّله الأدمن أو نوع عطّله يبقى كما هو)
@Injectable()
export class DocTypesDefaultsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DocTypesDefaultsService.name)

  constructor(
    @InjectRepository(DocType)
    private readonly docTypes: Repository<DocType>
  ) {}

  async onApplicationBootstrap() {
    try {
      const existing = new Set((await this.docTypes.find()).map((t) => t.code))
      const added: string[] = []
      for (const t of DOC_TYPES_SEED.filter((s) => !existing.has(s.code))) {
        try {
          // insert لا save: لا يكتب فوق صف أُضيف بالتوازي
          await this.docTypes.insert({ code: t.code, nameAr: t.nameAr, isActive: true })
          added.push(t.code)
        } catch (e) {
          this.logger.warn(`تعذر إضافة نوع المستند ${t.code}: ${(e as Error).message}`)
        }
      }
      if (added.length > 0) {
        this.logger.log(`أُضيفت أنواع مستندات أساسية للكتالوج: ${added.join(', ')}`)
      }
    } catch (e) {
      // لا يمنع الإقلاع — المستند الجديد يُرفض بنوع غير معروف حتى يكتمل الكتالوج
      this.logger.warn(`تعذر استكمال كتالوج أنواع المستندات: ${(e as Error).message}`)
    }
  }
}
