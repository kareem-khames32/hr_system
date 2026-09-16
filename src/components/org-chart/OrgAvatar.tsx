'use client'

import { useEffect, useState } from 'react'
import { fetchFileObjectUrl } from '@/lib/api'
import type { OrgPerson } from './orgChartModel'

// صور الموظفين بتتحمّل مرة واحدة للصفحة (فتح وقفل الفروع مايعيدش التحميل)
const photoCache = new Map<number, Promise<string | null>>()
const loadPhoto = (id: number) => {
  let hit = photoCache.get(id)
  if (!hit) {
    hit = fetchFileObjectUrl(id)
    photoCache.set(id, hit)
  }
  return hit
}

const SIZES = {
  sm: 'w-8 h-8 text-[11px] rounded-lg',
  md: 'w-11 h-11 text-sm rounded-xl',
  lg: 'w-14 h-14 text-base rounded-2xl',
}

export function OrgAvatar({
  person,
  size = 'md',
  tone = 'bg-gradient-to-br from-gray-400 to-gray-500',
}: {
  person: OrgPerson
  size?: keyof typeof SIZES
  tone?: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setUrl(null)
    if (person.photoFileId) {
      loadPhoto(person.photoFileId).then((u) => {
        if (alive) setUrl(u)
      })
    }
    return () => {
      alive = false
    }
  }, [person.photoFileId])

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={person.name} className={`${SIZES[size]} object-cover shrink-0 border border-gray-100`} />
  ) : (
    <div className={`${SIZES[size]} ${tone} shrink-0 flex items-center justify-center text-white font-bold`} aria-hidden>
      {person.initials}
    </div>
  )
}
