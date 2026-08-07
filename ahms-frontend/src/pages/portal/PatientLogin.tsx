import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { portalApi, saveAuth, errorMessage } from '../../lib/api'
import { Button, Input, Field } from '../../components/ui'

interface PortalLoginData {
  access_token: string
  refresh_token: string
  expires_in_seconds: number
  user: {
    id: string
    full_name: string
    email: string
    mobile: string
    role_name: string
    permissions: string[]
  }
}

export default function PatientLogin() {
  const navigate = useNavigate()
  const [uhid, setUhid] = useState('')
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await portalApi.post<{ data: PortalLoginData }>('/portal/login', { uhid, mobile })
      const d = res.data.data
      saveAuth(
        {
          access_token: d.access_token,
          refresh_token: d.refresh_token,
          expires_in_seconds: d.expires_in_seconds,
          user: {
            id: d.user.id,
            full_name: d.user.full_name,
            email: d.user.email,
            mobile: d.user.mobile,
            role_name: d.user.role_name,
            permissions: d.user.permissions ?? [],
          },
        },
        true,
      )
      navigate('/portal')
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your UHID and mobile number.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-emerald-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-800">Patient Portal</h1>
        <p className="mt-1 text-sm text-slate-500">Login with your UHID and registered mobile number</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Field label="UHID">
            <Input value={uhid} onChange={(e) => setUhid(e.target.value)} placeholder="AHMS-2026-XXXXXX" required />
          </Field>
          <Field label="Mobile Number">
            <Input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Registered mobile" required />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Don't know your UHID? Contact the hospital reception.
          <br />
          <Link to="/" className="text-emerald-700 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
