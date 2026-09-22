import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  DirectoryAuthError,
  DirectoryConfig,
  DirectoryProvider,
  DirectoryUser,
  directoryConfigGaps,
  directoryInsecureWarning,
  directoryUrl,
  escapeLdapFilterValue,
  isDisabledAccountControl,
  normalizeDomainLogin,
  objectGuidToString,
  readDirectoryConfig,
  scrubSecrets,
} from './directory.types'

// الخصائص الوحيدة اللي بنقراها من AD — ولا خاصية مجموعات واحدة فيها: الصلاحيات من جداولنا.
const ATTRIBUTES = [
  'objectGUID',
  'sAMAccountName',
  'userPrincipalName',
  'mail',
  'displayName',
  'employeeID',
  'userAccountControl',
]

const first = (value: unknown): string | null => {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === undefined || raw === null) return null
  const text = String(raw).trim()
  return text.length ? text : null
}

/**
 * الدخول بحساب الشركة على Active Directory عادي (ldapts).
 * - المجال يثبت الهوية بس: مفيش قراءة مجموعات ولا منح صلاحيات منه.
 * - الكلمات (كلمة المستخدم وكلمة حساب الخدمة) مابتتطبعش ولا بتتسجّل ولا بتترجّع في أي رد.
 * - الاختبارات بتستبدل authenticate على النسخة نفسها، فمفيش اتصال حقيقي في أي اختبار.
 */
@Injectable()
export class DirectoryService implements DirectoryProvider, OnApplicationBootstrap {
  private readonly logger = new Logger(DirectoryService.name)
  readonly config: DirectoryConfig

  constructor(config: ConfigService) {
    this.config = readDirectoryConfig({
      AD_ENABLED: config.get('AD_ENABLED'),
      AD_HOST: config.get('AD_HOST'),
      AD_PORT: config.get('AD_PORT'),
      AD_LDAPS: config.get('AD_LDAPS'),
      AD_TLS_REJECT_UNAUTHORIZED: config.get('AD_TLS_REJECT_UNAUTHORIZED'),
      AD_BASE_DN: config.get('AD_BASE_DN'),
      AD_UPN_SUFFIX: config.get('AD_UPN_SUFFIX'),
      AD_BIND_DN: config.get('AD_BIND_DN'),
      AD_BIND_PASSWORD: config.get('AD_BIND_PASSWORD'),
      AD_TIMEOUT_MS: config.get('AD_TIMEOUT_MS'),
    })
  }

  // تحذير مرة واحدة وقت الإقلاع: LDAPS مقفول = كلمات مرور المجال على الشبكة بلا تشفير.
  // مش بنسكت عنه ومش بنعتبره وضعًا طبيعيًّا — لكن الكود بيفضل شغّال (قرار المالك: يشتغل ويحذّر).
  onApplicationBootstrap() {
    if (!this.config.enabled) return
    const gaps = directoryConfigGaps(this.config)
    if (gaps.length) {
      this.logger.warn(
        `الدخول بحساب الشركة مش كامل الإعداد فهيفضل مقفول — ناقص: ${gaps.join(', ')} في api/.env`
      )
      return
    }
    const warning = directoryInsecureWarning(this.config)
    if (warning) this.logger.warn(`⚠️  ${warning}`)
    else this.logger.log(`الدخول بحساب الشركة مفتوح على ${directoryUrl(this.config)} (LDAPS)`)
  }

  isConfigured(): boolean {
    return this.config.enabled && directoryConfigGaps(this.config).length === 0
  }

  /** ملخص للشاشة — بلا أي سر (حساب الخدمة بيظهر كـ«مضبوط / غير مضبوط» بس). */
  status() {
    const gaps = directoryConfigGaps(this.config)
    return {
      enabled: this.config.enabled,
      configured: this.isConfigured(),
      missing: gaps,
      server: this.config.host ? directoryUrl(this.config) : null,
      ldaps: this.config.ldaps,
      upnSuffix: this.config.upnSuffix || null,
      serviceAccountConfigured: this.config.bindDn.length > 0,
      warning: directoryInsecureWarning(this.config),
    }
  }

  async authenticate(username: string, password: string): Promise<DirectoryUser> {
    if (!this.isConfigured()) {
      throw new DirectoryAuthError(
        'NOT_CONFIGURED',
        `إعداد المجال ناقص: ${directoryConfigGaps(this.config).join(', ') || 'AD_ENABLED=false'}`
      )
    }
    // كلمة مرور فاضية = «ربط مجهول» في LDAP وبينجح — فالرفض هنا قبل أي اتصال إلزامي
    if (typeof password !== 'string' || password.length === 0) {
      throw new DirectoryAuthError('INVALID_CREDENTIALS', 'كلمة مرور فاضية (ربط مجهول مرفوض)')
    }
    const name = normalizeDomainLogin(username, this.config.upnSuffix)
    if (!name) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'اسم دخول غير صالح')
    // دالة مسح محلية لنطاق المحاولة دي: أي نص خطأ بيمر عليها قبل السجل، ومفيش دالة في الكلاس
    // بتستقبل سرًّا كمعامل — فالسر عمره ما بيطلع بره نطاق authenticate
    const brief = this.briefer(password)

    // (1) bind بكلمة المستخدم نفسه = إثبات الهوية
    const userClient = this.client()
    try {
      await userClient.bind(name.upn, password)
    } catch (error) {
      await this.close(userClient, brief)
      throw this.bindFailure(error, brief)
    }

    // (2) قراءة الخصائص: بحساب الخدمة لو مضبوط، وإلا على اتصال المستخدم نفسه (AD بيسمح للحساب يقرأ نفسه)
    const useService = this.config.bindDn.length > 0
    const searchClient = useService ? this.client() : userClient
    try {
      if (useService) {
        try {
          await searchClient.bind(this.config.bindDn, this.config.bindPassword)
        } catch (error) {
          throw new DirectoryAuthError(
            'DIRECTORY_UNAVAILABLE',
            `فشل ربط حساب الخدمة (AD_BIND_DN): ${brief(error)}`
          )
        }
      }
      const filter =
        `(&(objectClass=user)(|(userPrincipalName=${escapeLdapFilterValue(name.upn)})` +
        `(sAMAccountName=${escapeLdapFilterValue(name.sam)})))`
      let entries: Array<Record<string, unknown>>
      try {
        const result = await searchClient.search(this.config.baseDn, {
          scope: 'sub',
          filter,
          attributes: ATTRIBUTES,
          // objectGUID ثنائي: بدون ده بيرجع نص متكسّر
          explicitBufferAttributes: ['objectGUID'],
          sizeLimit: 2,
        })
        entries = result.searchEntries as Array<Record<string, unknown>>
      } catch (error) {
        throw new DirectoryAuthError(
          'DIRECTORY_UNAVAILABLE',
          `فشل البحث في ${this.config.baseDn}: ${brief(error)}`
        )
      }
      if (entries.length === 0) {
        throw new DirectoryAuthError('NOT_FOUND_IN_DIRECTORY', `مفيش حساب بالفلتر تحت ${this.config.baseDn}`)
      }
      if (entries.length > 1) {
        throw new DirectoryAuthError('NOT_FOUND_IN_DIRECTORY', 'أكثر من حساب في الدليل بنفس الاسم — مش واضح مين')
      }
      const entry = entries[0]
      const objectGuid = objectGuidToString(entry.objectGUID)
      if (!objectGuid) {
        throw new DirectoryAuthError('NOT_FOUND_IN_DIRECTORY', 'objectGUID مش مقروء من الدليل')
      }
      const user: DirectoryUser = {
        objectGuid,
        sAMAccountName: first(entry.sAMAccountName) ?? name.sam,
        userPrincipalName: (first(entry.userPrincipalName) ?? name.upn).toLowerCase(),
        mail: first(entry.mail)?.toLowerCase() ?? null,
        displayName: first(entry.displayName),
        employeeId: first(entry.employeeID),
        disabled: isDisabledAccountControl(entry.userAccountControl),
      }
      if (user.disabled) throw new DirectoryAuthError('ACCOUNT_DISABLED', `الحساب ${user.sAMAccountName} متوقف في المجال`)
      return user
    } finally {
      await this.close(userClient, brief)
      if (useService) await this.close(searchClient, brief)
    }
  }

  // ===== أدوات داخلية =====

  // معزولة عن authenticate عشان الاختبار يقدر يتأكد إن مفيش عميل حقيقي بيتعمل
  protected client() {
    // require متأخر: الاختبارات اللي مابتلمسش المجال مابتحمّلش المكتبة
    const { Client } = require('ldapts') as typeof import('ldapts')
    return new Client({
      url: directoryUrl(this.config),
      timeout: this.config.timeoutMs,
      connectTimeout: this.config.timeoutMs,
      ...(this.config.ldaps
        ? { tlsOptions: { rejectUnauthorized: this.config.rejectUnauthorized, servername: this.config.host } }
        : {}),
    })
  }

  private async close(client: { unbind(): Promise<void> }, brief: (error: unknown) => string) {
    try {
      await client.unbind()
    } catch (error) {
      this.logger.debug(`تعذّر إغلاق اتصال الدليل: ${brief(error)}`)
    }
  }

  // فشل الـbind: بيانات غلط ولا الخادم مش راد؟ التفريق مهم — الرسالة للمستخدم مختلفة
  private bindFailure(error: unknown, brief: (error: unknown) => string): DirectoryAuthError {
    const detail = brief(error)
    const code = (error as { code?: number })?.code
    const name = (error as { name?: string })?.name ?? ''
    if (code === 49 || /InvalidCredentials/i.test(name)) {
      return new DirectoryAuthError('INVALID_CREDENTIALS', detail)
    }
    return new DirectoryAuthError('DIRECTORY_UNAVAILABLE', detail)
  }

  /**
   * يبني دالة «نص خطأ آمن للسجل» لنطاق محاولة واحدة: بتمسح سر المحاولة (اللي بيوصل هنا مرة واحدة
   * كـclosure) وسر حساب الخدمة. مفيش دالة تانية في الكلاس بتستقبل سرًّا، ومفيش سر بيتخزَّن على النسخة.
   */
  private briefer(attemptSecret: string): (error: unknown) => string {
    const secrets = [attemptSecret, this.config.bindPassword]
    return (error: unknown) =>
      scrubSecrets(String((error as Error)?.message ?? error), secrets).slice(0, 300)
  }
}
