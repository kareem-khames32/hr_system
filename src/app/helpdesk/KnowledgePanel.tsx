'use client'

// B3.10: قاعدة المعرفة قبل الاستفسار — الموظف بيدوّر بكلمة أو بنوع الاستفسار، وبيقرا المقال؛ ولو مالقاش إجابته بيفتح استفسار من نفس النوع.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Search } from 'lucide-react'
import { fetchArticle, searchArticles, type ApiArticle, type ApiArticleSummary } from '@/lib/helpdesk-api'

export default function KnowledgePanel() {
  const [term, setTerm] = useState('')
  const [typeCode, setTypeCode] = useState('')
  const [types, setTypes] = useState<Array<{ code: string; name: string }>>([])
  const [rows, setRows] = useState<ApiArticleSummary[]>([])
  const [open, setOpen] = useState<ApiArticle | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    searchArticles(term.trim(), typeCode)
      .then((data) => { setRows(data.articles); setTypes(data.types) })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل قاعدة المعرفة'))
  }, [term, typeCode])
  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const read = (id: number) => {
    if (open?.id === id) return setOpen(null)
    fetchArticle(id).then(setOpen).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر فتح المقال'))
  }

  return (
    <div className="card space-y-3" data-knowledge>
      <h2 className="font-bold text-gray-800 flex items-center gap-2">
        <BookOpen size={20} className="text-primary-600" />
        دوّر على إجابتك الأول
      </h2>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input w-full pr-9" maxLength={100} placeholder="اكتب سؤالك أو كلمة منه" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <select className="input" value={typeCode} onChange={(e) => setTypeCode(e.target.value)} aria-label="نوع الاستفسار">
          <option value="">كل الأنواع</option>
          {types.map((type) => (
            <option key={type.code} value={type.code}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}
      {rows.length === 0 && <p className="text-sm text-gray-500">مفيش مقالات مطابقة.</p>}
      <ul className="divide-y divide-gray-100">
        {rows.map((row) => (
          <li key={row.id} className="py-2">
            <button onClick={() => read(row.id)} className="text-right w-full">
              <span className="font-medium text-gray-800">{row.title}</span>
              {row.typeName && <span className="text-xs text-gray-400"> · {row.typeName}</span>}
              {open?.id !== row.id && <p className="text-xs text-gray-500 mt-1">{row.excerpt}</p>}
            </button>
            {open?.id === row.id && (
              <div className="bg-gray-50 rounded-xl p-3 mt-2 space-y-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{open.body}</p>
                {open.policy && (
                  <Link href="/policies" className="text-sm text-primary-600 hover:underline">
                    السياسة المرتبطة: {open.policy.title}
                  </Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-600">
        مالقيتش إجابتك؟{' '}
        <Link href={typeCode ? `/requests?type=${typeCode}` : '/requests'} className="text-primary-600 hover:underline">
          افتح استفسار
        </Link>
      </p>
    </div>
  )
}
