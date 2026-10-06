import { SetMetadata } from '@nestjs/common'

// B2.7-أ: علامة المسارات اللي بتفضل شغالة والحساب مقفول على إقرار سياسة (ملف لوحده من غير أي استيراد تاني: متحكمات الدخول والموديولات
// بتستعمله من غير ما تجرّ معاها خدمة السياسات)
export const ALLOW_DURING_POLICY_GATE = 'allowDuringPolicyGate'
/** المسار ده شغال والحساب مقفول على إقرار: الإقرار نفسه، وقايمة اللي مستنيه، وعرض السياسة، و«مين أنا»، والموديولات المفعّلة */
export const AllowDuringPolicyGate = () => SetMetadata(ALLOW_DURING_POLICY_GATE, true)
