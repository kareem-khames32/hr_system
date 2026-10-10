import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { withoutDataPlaceholder } from '../common/data-placeholders'
import { ModulesService } from '../modules-registry/modules.service'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PUBLIC_CAREERS_FEATURE } from './careers'
import { CareersService } from './careers.service'
import { JOB_FEEDS, JOB_SOURCES, careersBaseOf, isJobFeedName, jobsFeedXml, type PublicBase } from './job-share'
import { RecruitmentJob } from './recruitment-job.entity'
import { recruitmentJobsReady } from './recruitment-rules'

export const JOB_SHARE_NOT_PUBLIC = 'النشر على السوشيال ميديا للوظيفة المنشورة «خارجي» بس — انشر الوظيفة وعلّم «خارجي (صفحة الوظائف)» الأول'
const JOB_NOT_FOUND = 'الوظيفة غير موجودة'
const FEED_NOT_FOUND = 'الفيد غير موجود'

/** النشر التلقائي على صفحة الشركة بالـAPI الرسمي لكل منصة: مكان الإعداد بس — مقفول لحد ما بيانات الربط تتحط (مفيش نداء خارجي ولا توكن بيتحفظ) */
export const AUTO_PUBLISH_CHANNELS = [
  { key: 'linkedin', label: 'LinkedIn', needs: 'تطبيق مطوّر معتمد من LinkedIn (Community Management API) مربوط بصفحة الشركة' },
  { key: 'facebook', label: 'Facebook', needs: 'تطبيق Meta معتمد بصلاحية النشر على صفحة الشركة' },
  { key: 'instagram', label: 'Instagram', needs: 'حساب Instagram أعمال مربوط بصفحة Facebook وتطبيق Meta معتمد' },
] as const

// B-ADD.6: «انشر الوظيفة» — بيانات البوست وأزرار المشاركة لمسؤول التوظيف، وقنوات النشر، وفيد XML العام. قراءة بس: مفيش صف بيتكتب، ومفيش
// نداء خارجي. اللي بيطلع عن الوظيفة هو شكلها العام (CareersService.views) بالحرف.
@Injectable()
export class JobShareService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly config: ConfigService,
    private readonly modules: ModulesService,
    private readonly careers: CareersService,
  ) {}

  /** العنوان اللي لينك التقديم بيتبني عليه: CAREERS_PUBLIC_URL لو مضبوط، وإلا FRONTEND_URL (نفس اللي لينكات البريد بتتبني عليه) */
  base(): PublicBase {
    return careersBaseOf(this.config.get<string>('CAREERS_PUBLIC_URL'), this.config.get<string>('FRONTEND_URL'))
  }

  /** اسم الشركة من «بيانات الشركة» (نفس قراءة الهوية العامة: القيمة المؤقتة = مش مضبوط) */
  private async company(em: EntityManager): Promise<string | null> {
    return withoutDataPlaceholder((await em.getRepository(RequestsConfig).findOne({ where: { key: 'company.name' } }))?.value) || null
  }

  /** حالة النشر العامة: صفحة الوظائف مفتوحة؟ وعنوانها العام مضبوط ومتاح من برّه؟ */
  private async state() {
    const base = this.base()
    return { careersOpen: await this.modules.isFeatureEnabled(PUBLIC_CAREERS_FEATURE), baseUrl: base.url, baseInternal: base.internal }
  }

  /**
   * بيانات لوحة «انشر الوظيفة»: الوظيفة في نطاق فروع الحساب وإلا غير موجودة، ومنشورة «خارجي» وإلا مرفوضة برسالتها. الرد: الوظيفة بشكلها
   * العام بس (من غير راتب ولا قسم ولا سبب احتياج ولا مرشحين)، واسم الشركة، وحالة النشر، والمصادر اللي لينك كل واحد بيتعلّم بيها.
   */
  async kit(user: JwtPayload, id: number) {
    const em = this.ds.manager
    const row = (await recruitmentJobsReady(em)) ? await em.getRepository(RecruitmentJob).findOne({ where: { id } }) : null
    if (!row || !inBranchScope(branchScopeOf(user), row.branchId)) throw new NotFoundException(JOB_NOT_FOUND)
    if (row.status !== 'PUBLISHED' || row.external !== true) throw new BadRequestException(JOB_SHARE_NOT_PUBLIC)
    return {
      ...(await this.state()), company: await this.company(em), job: (await this.careers.views(em, [row]))[0],
      sources: JOB_SOURCES.map((source) => ({ key: source.key, label: source.label })),
    }
  }

  /** «قنوات النشر»: الفيدات المتاحة (اللينك بيتركّب في الواجهة على عنوان الـAPI)، ومكان النشر التلقائي المقفول */
  async channels() {
    return {
      ...(await this.state()),
      feeds: Object.entries(JOB_FEEDS).map(([name, feed]) => ({ name, label: feed.label })),
      autoPublish: AUTO_PUBLISH_CHANNELS.map((channel) => ({ key: channel.key, label: channel.label, needs: channel.needs, enabled: false })),
    }
  }

  /**
   * الفيد العام (من غير دخول، ورا ميزة صفحة الوظائف): الوظائف المنشورة «خارجي» بس وبشكلها العام. من غير عنوان واجهة مضبوط مفيش لينك
   * تقديم صح يتكتب، فالفيد غير موجود.
   */
  async feed(name: string): Promise<string> {
    const base = this.base()
    if (!isJobFeedName(name) || !base.url) throw new NotFoundException(FEED_NOT_FOUND)
    const em = this.ds.manager
    return jobsFeedXml(name, await this.careers.published(em), (await this.company(em)) ?? '', base.url)
  }
}
