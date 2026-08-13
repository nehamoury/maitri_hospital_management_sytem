import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Props {
  patientId?: string
  className?: string
  fallbackClassName?: string
  fallbackChar?: string
}

// Loads a patient photo through the authenticated, ownership-checked
// /patients/:id/photo endpoint. Patient photos are never served from a
// public static path, so a raw <img src="/uploads/..."> would 404.
export function PatientPhoto({ patientId, className, fallbackClassName, fallbackChar = 'P' }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    if (!patientId) return
    api
      .get(`/patients/${patientId}/photo`, { responseType: 'blob' })
      .then((res) => {
        if (!cancelled) setSrc(URL.createObjectURL(res.data as Blob))
      })
      .catch(() => {
        // No photo — fallback initials render.
      })
    return () => {
      cancelled = true
    }
  }, [patientId])

  if (src) return <img src={src} alt="patient" className={className} />
  return <div className={fallbackClassName}>{fallbackChar}</div>
}
