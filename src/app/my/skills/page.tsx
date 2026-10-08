'use client'

// B5.4 (أ): «مهاراتي» — فجوة صاحب الحساب عن المهارات المطلوبة لوظيفته، ومصفوفة مرؤوسيه المباشرين (المدير بيقيّم مهاراتهم). موديول skills (مقفول افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import SkillMatrix from '@/components/skills/SkillMatrix'
import { fetchMySkills, fetchMyTeamSkills, type ApiSkillRow, type SkillLevel } from '@/lib/skills-api'

const LEVELS: Array<{ code: SkillLevel; label: string }> = [{ code: 'beginner', label: 'مبتدئ' }, { code: 'intermediate', label: 'متوسط' }, { code: 'advanced', label: 'متقدم' }, { code: 'expert', label: 'خبير' }]

export default function MySkillsPage() {
  const [mine, setMine] = useState<{ ready: boolean; row: ApiSkillRow | null } | null>(null)
  const [team, setTeam] = useState<ApiSkillRow[]>([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetchMySkills().then(setMine).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل مهاراتك'))
    fetchMyTeamSkills().then((result) => setTeam(result.rows)).catch(() => setTeam([]))
  }, [])
  useEffect(load, [load])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <GraduationCap size={24} className="text-primary-600" />
            مهاراتي
          </h1>
          <p className="text-gray-500 mt-1">المهارات المطلوبة لوظيفتك ومستواك فيها. التقييم بيعمله مديرك المباشر أو الموارد البشرية.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {mine && !mine.ready && <div className="card text-amber-800 bg-amber-50">جداول المهارات لسه ماتطبّقتش على قاعدة البيانات.</div>}

        {mine?.ready && (
          <div className="card space-y-3" data-my-skills>
            <h2 className="text-lg font-semibold text-gray-800">مهارات وظيفتي</h2>
            {mine.row ? <SkillMatrix rows={[mine.row]} levels={LEVELS} canAssess={false} onChanged={load} /> : <p className="text-gray-500">مفيش بيانات مهارات لحسابك.</p>}
          </div>
        )}

        {team.length > 0 && (
          <div className="card space-y-3" data-team-skills>
            <h2 className="text-lg font-semibold text-gray-800">مهارات فريقي</h2>
            <p className="text-xs text-gray-500">مرؤوسيك المباشرين. قيّم مستوى كل واحد في مهارات وظيفته.</p>
            <SkillMatrix rows={team} levels={LEVELS} canAssess onChanged={load} />
          </div>
        )}
      </div>
    </MainLayout>
  )
}
