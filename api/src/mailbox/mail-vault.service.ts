import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { jwtLifetimeSeconds } from '../auth/jwt-secret'
import { MailVault, UnlockAttempts, type VaultScope } from './mail-vault'

/**
 * B-ADD.16: مخزن كلمة سر البريد للجلسة (القواعد والتصميم في mail-vault.ts). نسخة واحدة في العملية: النص المشفّر في ذاكرتها بس —
 * إعادة تشغيل الخادم بتمسحه (والموظف بيكتب كلمة مرور بريده مرة تانية)، وخادمين ورا موزّع أحمال مايشوفوش نص بعض.
 */
@Injectable()
export class MailVaultService implements OnModuleDestroy {
  private readonly vault: MailVault
  /** محاولات «افتح بريدك» الغلط لكل حساب */
  readonly attempts = new UnlockAttempts()
  private readonly sweeper: NodeJS.Timeout

  constructor(config: ConfigService) {
    // عمر الخانة من آخر استخدام = مدة الجلسة (JWT_EXPIRES_IN)
    const ttlMs = jwtLifetimeSeconds(config.get<string>('JWT_EXPIRES_IN', '8h')) * 1000
    this.vault = new MailVault(() => ttlMs)
    this.sweeper = setInterval(() => this.vault.sweep(), 60_000)
    this.sweeper.unref()
  }

  onModuleDestroy() {
    clearInterval(this.sweeper)
    this.vault.clear()
  }

  store(scope: VaultScope, password: string, hardExpiresAt: number | null = null): string { return this.vault.store(scope, password, hardExpiresAt) }
  read(scope: VaultScope, browserKey: string | null | undefined): string | null { return this.vault.read(scope, browserKey) }
  has(scope: VaultScope): boolean { return this.vault.has(scope) }
  drop(scope: VaultScope): boolean { return this.vault.drop(scope) }
  dropUser(userId: number): number { return this.vault.dropUser(userId) }
}
