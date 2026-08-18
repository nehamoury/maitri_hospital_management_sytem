import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { errorMessage } from '../../lib/api'
import { Button, Input, Field } from '../../components/ui'
import { KeyRound, ShieldAlert } from 'lucide-react'

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(errorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const testAccounts = [
    { role: 'Super Admin', email: 'admin@ahms.local', pass: 'ChangeMe123!' },
    { role: 'Hospital Admin', email: 'demo.hadmin@ahms.local', pass: 'Demo@12345' },
    { role: 'Receptionist', email: 'demo.receptionist@ahms.local', pass: 'Demo@12345' },
    { role: 'Doctor', email: 'demo.doctor@ahms.local', pass: 'Demo@12345' },
    { role: 'Panchakarma Doctor', email: 'demo.pkdoctor@ahms.local', pass: 'Demo@12345' },
    { role: 'Nurse', email: 'demo.nurse@ahms.local', pass: 'Demo@12345' },
    { role: 'Therapist', email: 'demo.therapist@ahms.local', pass: 'Demo@12345' },
    { role: 'Pharmacist', email: 'demo.pharmacist@ahms.local', pass: 'Demo@12345' },
    { role: 'Billing / Accounts', email: 'demo.billing@ahms.local', pass: 'Demo@12345' },
    { role: 'Ward Staff', email: 'demo.wardstaff@ahms.local', pass: 'Demo@12345' },
    { role: 'Lab Staff', email: 'demo.lab@ahms.local', pass: 'Demo@12345' },
  ]

  const handleQuickLogin = (testEmail: string, testPass: string) => {
    setEmail(testEmail)
    setPassword(testPass)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8 space-y-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AHMS Admin</h1>
            <p className="text-xs text-muted-foreground">Ayurvedic Hospital Management System</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 flex items-start gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <Field label="Email Address">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ahms.local"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Button type="submit" className="w-full shadow-sm mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Quick Demo Logins Section */}
        <div className="mt-6 pt-5 border-t border-border space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick Demo Login Profiles</p>
          <div className="grid grid-cols-2 gap-2">
            {testAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickLogin(acc.email, acc.pass)}
                className="text-[11px] font-semibold text-foreground bg-muted/40 border border-border rounded-xl p-2 text-left hover:bg-muted/80 hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="text-primary font-bold truncate">{acc.role}</div>
                <div className="text-muted-foreground text-[10px] truncate">{acc.email}</div>
                <div className="text-slate-400 text-[10px] truncate mt-0.5 font-mono">pwd: {acc.pass}</div>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          For patients use the{' '}
          <a href="/portal/login" className="text-primary font-bold hover:underline">
            Patient Portal
          </a>
        </p>
      </div>
    </div>
  )
}
