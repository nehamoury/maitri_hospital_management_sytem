import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { portalApi, errorMessage } from '../../lib/api'
import { Card, CardHeader, EmptyState, Spinner } from '../../components/ui'

interface Profile {
  id: string
  uhid: string
  full_name: string
  gender: string
  dob: string
  age: number
  mobile: string
  email: string
  address: string
  blood_group: string
}

export default function PortalProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    portalApi
      .get<{ data: Profile }>('/portal/profile')
      .then((res) => setProfile(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load profile')))
  }, [])

  if (error) return <EmptyState message={error} />
  if (!profile) return <Spinner label="Loading profile..." />

  const rows: [string, string][] = [
    ['UHID', profile.uhid],
    ['Full Name', profile.full_name],
    ['Gender', profile.gender],
    ['Date of Birth', profile.dob ? new Date(profile.dob).toLocaleDateString() : '—'],
    ['Age', String(profile.age)],
    ['Mobile', profile.mobile],
    ['Email', profile.email || '—'],
    ['Blood Group', profile.blood_group || '—'],
    ['Address', profile.address || '—'],
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white shadow-lg mb-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 border border-emerald-700/20">
              Maitri Ayurveda Portal
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">My Profile</h1>
            <p className="text-emerald-100/70 text-xs md:text-sm">Your registered details</p>
          </div>
          <Link to="/portal" className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors border border-white/10">
            ← Dashboard
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader title="Personal Information" />
        <div className="divide-y divide-slate-100 p-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between px-3 py-3">
              <span className="text-sm text-slate-500">{k}</span>
              <span className="text-sm font-medium text-slate-800">{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
