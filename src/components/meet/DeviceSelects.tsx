'use client'

import type { Room } from 'livekit-client'
import { useEffect, useState } from 'react'
import type { MeetPrefs } from './devices'

/** اختيار الكاميرا والمايك والسماعة (الأسماء بتظهر بعد ما المتصفح يسمح). جوه الغرفة التبديل فوري. */
export default function DeviceSelects({ prefs, setPrefs, tick, room, dark = false }: { prefs: MeetPrefs; setPrefs: (prefs: Partial<MeetPrefs>) => void; tick: number; room?: Room; dark?: boolean }) {
  const [devices, setDevices] = useState<{ cams: MediaDeviceInfo[]; mics: MediaDeviceInfo[]; outs: MediaDeviceInfo[] }>({ cams: [], mics: [], outs: [] })

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const refresh = () =>
      navigator.mediaDevices.enumerateDevices().then((all) => {
        const real = all.filter((device) => device.deviceId)
        setDevices({ cams: real.filter((device) => device.kind === 'videoinput'), mics: real.filter((device) => device.kind === 'audioinput'), outs: real.filter((device) => device.kind === 'audiooutput') })
      }).catch(() => undefined)
    refresh()
    navigator.mediaDevices.addEventListener('devicechange', refresh)
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh)
  }, [tick])

  const pick = async (kind: MediaDeviceKind, deviceId: string) => {
    if (kind === 'videoinput') setPrefs({ camId: deviceId })
    else if (kind === 'audioinput') setPrefs({ micId: deviceId })
    else setPrefs({ outId: deviceId })
    if (room) await room.switchActiveDevice(kind, deviceId || 'default').catch(() => undefined)
  }

  const select = (label: string, kind: MediaDeviceKind, list: MediaDeviceInfo[], value: string) =>
    list.length > 0 && (
      <label className={`block text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
        {label}
        <select className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-800'}`}
          value={list.some((device) => device.deviceId === value) ? value : ''} onChange={(event) => void pick(kind, event.target.value)}>
          <option value="">الجهاز الافتراضي</option>
          {list.filter((device) => device.deviceId !== 'default').map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `${label} ${index + 1}`}
            </option>
          ))}
        </select>
      </label>
    )

  // اختيار السماعة في المتصفحات اللي بتدعمه بس (Chrome و Edge)
  const canPickOutput = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype
  return (
    <div className="space-y-3">
      {select('الكاميرا', 'videoinput', devices.cams, prefs.camId)}
      {select('المايك', 'audioinput', devices.mics, prefs.micId)}
      {canPickOutput && select('السماعة', 'audiooutput', devices.outs, prefs.outId)}
    </div>
  )
}
