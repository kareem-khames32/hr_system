import {
  addCertification,
  addEducation,
  addExperience,
  addLanguage,
  addSkill,
} from '@/lib/api'
import type { QualificationsPayload } from '@/components/EmployeeForm'

// حفظ قوائم المؤهلات/الخبرات بعد إنشاء أو تعديل الموظف (تحتاج employeeId).
// تُستدعى من صفحتَي الإضافة والتعديل. الفشل هنا لا يُلغي حفظ الموظف نفسه —
// يُعاد كنص تحذيري ليُعرض للمستخدم.
export async function saveQualifications(
  employeeId: number,
  q?: QualificationsPayload
): Promise<string> {
  if (!q) return ''
  const num = (v?: string) => (v && v !== '' ? Number(v) : undefined)
  const failed: string[] = []

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
    } catch {
      failed.push(label)
    }
  }

  for (const r of q.education ?? []) {
    await run('مؤهل', () =>
      addEducation(employeeId, {
        degree: r.degree,
        major: r.major || undefined,
        institution: r.institution || undefined,
        graduationYear: num(r.graduationYear),
      })
    )
  }
  for (const r of q.certifications ?? []) {
    await run('شهادة', () =>
      addCertification(employeeId, {
        name: r.name,
        issuer: r.issuer || undefined,
        issueDate: r.issueDate || undefined,
        expiryDate: r.expiryDate || undefined,
      })
    )
  }
  for (const r of q.experiences ?? []) {
    await run('خبرة', () =>
      addExperience(employeeId, {
        company: r.company,
        jobTitle: r.jobTitle || undefined,
        country: r.country || undefined,
        fromDate: r.fromDate || undefined,
        toDate: r.toDate || undefined,
        leaveReason: r.leaveReason || undefined,
      })
    )
  }
  for (const r of q.skills ?? []) {
    await run('مهارة', () =>
      addSkill(employeeId, {
        name: r.name,
        level: r.level || undefined,
        yearsExperience: num(r.yearsExperience),
      })
    )
  }
  for (const r of q.languages ?? []) {
    await run('لغة', () =>
      addLanguage(employeeId, {
        language: r.language,
        speaking: r.speaking || undefined,
        writing: r.writing || undefined,
        reading: r.reading || undefined,
      })
    )
  }

  return failed.length
    ? `تم حفظ الموظف، لكن تعذّر حفظ: ${failed.join('، ')}`
    : ''
}
