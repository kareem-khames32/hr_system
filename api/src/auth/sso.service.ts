import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { DirectoryUser } from './directory.types'
import { authorizationUrl, newSsoTransaction, openSsoTransaction, sameState, sealSsoTransaction, secureUrl, SSO_IDENTITY_REFUSED, SSO_NOT_CONFIGURED, SSO_PROVIDER_FAILED, SSO_TX_INVALID, ssoConfig, ssoIdentity,
  SsoTokenError, verifyIdToken, type Jwk, type SsoConfig } from './sso-oidc'

// B6.4: الدخول المؤسسي بـOIDC — الجزء اللي بيكلّم المزوّد: وثيقة الاكتشاف، مفاتيح التوقيع، وتبديل الكود بالـID token.
// المزوّد من إعداد الخادم بس (مش من الطلب)، وكل عنوان بيتكلّمه https. الناتج هوية بشكل `DirectoryUser` — المطابقة والحساب والجلسة في AuthService.

interface Discovery { authorizationEndpoint: string; tokenEndpoint: string; jwksUri: string; at: number }
const DISCOVERY_TTL_MS = 10 * 60_000
const JWKS_TTL_MS = 10 * 60_000
const PROVIDER_TIMEOUT_MS = 10_000

@Injectable()
export class SsoService {
  private readonly logger = new Logger('Sso')
  private discovery: Discovery | null = null
  private keys: { keys: Jwk[]; at: number } | null = null

  constructor(private readonly config: ConfigService) {}

  /** الإعداد الحالي (من البيئة) — null = المسار مقفول */
  settings(): SsoConfig | null {
    return ssoConfig(process.env)
  }

  options() {
    const config = this.settings()
    // مش مضبوط = ولا مفتاح في الرد (شاشة الدخول زي ما كانت بالحرف)
    return config ? { ssoEnabled: true as const, ssoLabel: config.label } : {}
  }

  private serverSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET')
  }

  private required(): SsoConfig {
    const config = this.settings()
    if (!config) throw new ServiceUnavailableException(SSO_NOT_CONFIGURED)
    return config
  }

  private async json(url: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    // من غير تتبّع تحويل، وبمهلة
    const response = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) })
    if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status}`)
    const parsed: unknown = await response.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not a JSON object')
    return parsed as Record<string, unknown>
  }

  /** وثيقة اكتشاف المزوّد: `issuer` فيها لازم يساوي المضبوط بالحرف، وكل عنوان https */
  private async discover(config: SsoConfig): Promise<Discovery> {
    if (this.discovery && Date.now() - this.discovery.at < DISCOVERY_TTL_MS) return this.discovery
    const document = await this.json(`${config.issuer}/.well-known/openid-configuration`)
    const authorizationEndpoint = document.authorization_endpoint, tokenEndpoint = document.token_endpoint, jwksUri = document.jwks_uri
    if (document.issuer !== config.issuer || ![authorizationEndpoint, tokenEndpoint, jwksUri].every(url => secureUrl(url, config.allowInsecure))) throw new Error('discovery document does not match the configured issuer')
    this.discovery = { authorizationEndpoint: String(authorizationEndpoint), tokenEndpoint: String(tokenEndpoint), jwksUri: String(jwksUri), at: Date.now() }
    return this.discovery
  }

  private async signingKeys(config: SsoConfig, fresh = false): Promise<Jwk[]> {
    if (!fresh && this.keys && Date.now() - this.keys.at < JWKS_TTL_MS) return this.keys.keys
    const document = await this.json((await this.discover(config)).jwksUri)
    const keys = Array.isArray(document.keys) ? (document.keys as Jwk[]).filter(key => key && typeof key === 'object') : []
    this.keys = { keys, at: Date.now() }
    return keys
  }

  /** بداية الدخول: عنوان صفحة المزوّد، والمعاملة الموقّعة (للـcookie) */
  async start(): Promise<{ url: string; sealed: string }> {
    const config = this.required()
    try {
      const discovery = await this.discover(config), tx = newSsoTransaction(Math.floor(Date.now() / 1000))
      return { url: authorizationUrl(discovery.authorizationEndpoint, config, tx), sealed: sealSsoTransaction(tx, this.serverSecret()) }
    } catch (failure) {
      this.logger.warn(`تعذّر الوصول لمزوّد الهوية: ${failure instanceof Error ? failure.message : failure}`)
      throw new ServiceUnavailableException(SSO_PROVIDER_FAILED)
    }
  }

  /**
   * إكمال الدخول: المعاملة من الـcookie والـstate الراجع، تبديل الكود (بسر التطبيق ومفتاح PKCE)، وتحقق الـID token.
   * أي رفض برسالة واحدة للمستخدم؛ السبب في سجل الخادم بس.
   */
  async finish(code: unknown, state: unknown, sealed: unknown): Promise<DirectoryUser> {
    const config = this.required(), now = Math.floor(Date.now() / 1000)
    const tx = openSsoTransaction(sealed, this.serverSecret(), now)
    if (!tx || !sameState(state, tx.state) || typeof code !== 'string' || !code || code.length > 4000) throw new UnauthorizedException(SSO_TX_INVALID)
    let token: Record<string, unknown>
    try {
      token = await this.json((await this.discover(config)).tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, client_id: config.clientId, client_secret: config.clientSecret, code_verifier: tx.verifier }).toString() })
    } catch (failure) {
      this.logger.warn(`تبديل كود الدخول المؤسسي فشل: ${failure instanceof Error ? failure.message : failure}`)
      throw new UnauthorizedException(SSO_PROVIDER_FAILED)
    }
    const expected = { issuer: config.issuer, clientId: config.clientId, nonce: tx.nonce }
    try {
      let claims: Record<string, unknown>
      try {
        claims = verifyIdToken(token.id_token, await this.signingKeys(config), expected, now)
      } catch (failure) {
        // مفتاح مش معروف: المزوّد ممكن يكون دوّر مفاتيحه — قراءة جديدة مرة واحدة
        if (!(failure instanceof SsoTokenError) || failure.code !== 'UNKNOWN_KEY') throw failure
        claims = verifyIdToken(token.id_token, await this.signingKeys(config, true), expected, now)
      }
      return ssoIdentity(claims, config)
    } catch (failure) {
      if (failure instanceof SsoTokenError) {
        this.logger.warn(`رفض هوية الدخول المؤسسي [${failure.code}]`)
        throw new UnauthorizedException(['LOGIN_CLAIM', 'EMAIL_UNVERIFIED', 'DOMAIN'].includes(failure.code) ? SSO_IDENTITY_REFUSED : SSO_PROVIDER_FAILED)
      }
      this.logger.warn(`تعذّر تحقق هوية الدخول المؤسسي: ${failure instanceof Error ? failure.message : failure}`)
      throw new UnauthorizedException(SSO_PROVIDER_FAILED)
    }
  }
}
