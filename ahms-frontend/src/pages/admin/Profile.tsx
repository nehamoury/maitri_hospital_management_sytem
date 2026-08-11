import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Card, CardHeader, PageHeader, Field, Input, Button, Spinner, EmptyState, Badge } from '../../components/ui'

interface Profile {
  id: string
  full_name: string
  email: string
  mobile: string
  role_name: string
}

export default function Profile() {
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    api
      .get<{ data: Profile }>('/auth/me')
      .then((res) => {
        setProfile(res.data.data)
        setFullName(res.data.data.full_name)
        setEmail(res.data.data.email)
        setMobile(res.data.data.mobile)
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load profile')))
  }, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const res = await api.put<{ data: Profile }>('/auth/me', { full_name: fullName, email, mobile })
      setProfile(res.data.data)
      updateUser({ full_name: res.data.data.full_name, email: res.data.data.email, mobile: res.data.data.mobile })
      setMsg('Profile updated')
    } catch (err) {
      setMsg(errorMessage(err, 'Failed to update profile'))
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg('')
    if (newPassword !== confirmPassword) {
      setPwMsg('New passwords do not match')
      return
    }
    setChanging(true)
    try {
      await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwMsg('Password changed')
    } catch (err) {
      setPwMsg(errorMessage(err, 'Failed to change password'))
    } finally {
      setChanging(false)
    }
  }

  if (error) return <EmptyState message={error} />
  if (!profile) return <Spinner label="Loading profile..." />

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="My Profile"
        subtitle="Your account details and security"
        action={<Badge color="green">{profile.role_name}</Badge>}
      />

      <Card className="mb-6">
        <CardHeader title="Personal Information" subtitle="This name, email, and mobile are shown to other staff." />
        <form onSubmit={saveProfile} className="space-y-4 p-6">
          <Field label="Full Name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Mobile">
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </Field>
          {msg && <p className={`text-sm font-medium ${msg === 'Profile updated' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change Password" subtitle="You will be asked to log in again after changing your password." />
        <form onSubmit={changePassword} className="space-y-4 p-6">
          <Field label="Current Password">
            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
          </Field>
          <Field label="New Password" hint="At least 6 characters">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </Field>
          {pwMsg && <p className={`text-sm font-medium ${pwMsg === 'Password changed' ? 'text-emerald-600' : 'text-rose-600'}`}>{pwMsg}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={changing}>
              {changing ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}