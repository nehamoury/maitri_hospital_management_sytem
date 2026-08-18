import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Card, Field, Input, Button, Spinner, EmptyState } from '../../components/ui'
import { User, Lock, Mail, Phone, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'

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
      setMsg('Profile updated successfully')
    } catch (err) {
      setMsg(errorMessage(err, 'Failed to update profile'))
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 5000)
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
      setPwMsg('Password changed successfully')
    } catch (err) {
      setPwMsg(errorMessage(err, 'Failed to change password'))
    } finally {
      setChanging(false)
      setTimeout(() => setPwMsg(''), 5000)
    }
  }

  if (error) return <EmptyState message={error} />
  if (!profile) return <Spinner label="Loading your profile..." />

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>Account Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal information and security preferences.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 border border-emerald-100 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">{profile.role_name}</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Personal Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/50">
            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Personal Information</h2>
                  <p className="text-xs text-slate-500">This information is visible to other staff members.</p>
                </div>
              </div>
            </div>
            <form onSubmit={saveProfile} className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Full Name">
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <Input 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        required 
                        minLength={2} 
                        className="pl-9"
                      />
                    </div>
                  </Field>
                </div>
                <div>
                  <Field label="Email Address">
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <Input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="pl-9"
                      />
                    </div>
                  </Field>
                </div>
                <div>
                  <Field label="Mobile Number">
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <Input 
                        value={mobile} 
                        onChange={(e) => setMobile(e.target.value)} 
                        className="pl-9"
                      />
                    </div>
                  </Field>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <div className="h-5">
                  {msg && (
                    <div className={`flex items-center gap-2 text-sm font-medium ${msg.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {msg.includes('success') ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {msg}
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-8">
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/50">
            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Security</h2>
                  <p className="text-xs text-slate-500">Update your password</p>
                </div>
              </div>
            </div>
            <form onSubmit={changePassword} className="p-6 space-y-5">
              <Field label="Current Password">
                <Input 
                  type="password" 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)} 
                  required 
                  placeholder="••••••••"
                />
              </Field>
              <Field label="New Password" hint="Must be at least 6 characters">
                <Input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  minLength={6} 
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Confirm New Password">
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  placeholder="••••••••"
                />
              </Field>

              <div className="pt-2">
                {pwMsg && (
                  <div className={`mb-3 flex items-center gap-2 text-sm font-medium ${pwMsg.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {pwMsg.includes('success') ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {pwMsg}
                  </div>
                )}
                <Button type="submit" disabled={changing} className="w-full justify-center">
                  {changing ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}