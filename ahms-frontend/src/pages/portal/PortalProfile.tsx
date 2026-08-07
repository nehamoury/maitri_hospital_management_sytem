import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { portalApi, errorMessage } from '../../lib/api'
import { Card, CardHeader, EmptyState, Spinner, PageHeader } from '../../components/ui'

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
      <PageHeader
        title="My Profile"
        subtitle="Your registered details"
        action={
          <Link to="/portal" className="text-sm text-emerald-700 hover:underline">
            ← Back to portal
          </Link>
        }
      />
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
