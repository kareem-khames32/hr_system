'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { downloadLetter } from '@/lib/api'

export default function LetterDownloadButton({ reference }: { reference?: string | null }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const match = /^LTR-(\d+)$/.exec(reference || '')
  if (!match) return null
  return <div><button disabled={busy} className="text-sm text-primary-700 bg-primary-50 rounded-lg px-3 py-2 inline-flex gap-2 items-center disabled:opacity-50"
    onClick={async () => { setBusy(true); setError(''); try { await downloadLetter(Number(match[1])) } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر تحميل الخطاب') } finally { setBusy(false) } }}>
    <Download size={16} />{busy ? 'جارٍ التحميل…' : 'تحميل الخطاب PDF'}</button>
    {error && <p className="text-red-600 text-xs mt-2" role="alert">{error}</p>}</div>
}
