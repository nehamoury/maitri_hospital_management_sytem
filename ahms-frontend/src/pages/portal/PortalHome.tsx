import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, FileText, IndianRupee, LogOut, ArrowRight, User2, MapPin, Phone, Droplet, Activity } from 'lucide-react'
import { portalApi, getPortalUser, clearPortalAuth, errorMessage } from '../../lib/api'
import { Card, CardHeader, Badge, Spinner, EmptyState, Button } from '../../components/ui'

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

interface Appt {
  id: string
  doctor_name: string
  appointment_date: string
  token_number: number
  status: string
  reason: string
}

interface Rx {
  id: string
  date: string
  doctor: string
  status: string
  notes: string
}

interface Bill {
  id: string
  bill_no: string
  date: string
  net_amount: number
  paid_amount: number
  due_amount: number
  payment_status: string
}

export default function PortalHome() {
  const navigate = useNavigate()
  const user = getPortalUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appts, setAppts] = useState<Appt[]>([])
  const [rx, setRx] = useState<Rx[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const currentUser = getPortalUser()
    if (!currentUser) {
      navigate('/portal/login')
      return
    }
    portalApi
      .get<{ data: Profile }>('/portal/profile')
      .then((res) => setProfile(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load profile')))
    portalApi
      .get<{ data: Appt[] }>('/portal/appointments')
      .then((res) => setAppts(res.data.data))
      .catch(() => {})
    portalApi
      .get<{ data: Rx[] }>('/portal/prescriptions')
      .then((res) => setRx(res.data.data))
      .catch(() => {})
    portalApi
      .get<{ data: Bill[] }>('/portal/bills')
      .then((res) => setBills(res.data.data))
      .catch(() => {})
  }, [navigate])

  const logout = async () => {
    try {
      await portalApi.post('/auth/logout')
    } catch {
      // Proceed with local cleanup
    }
    clearPortalAuth()
    navigate('/portal/login')
  }

  if (!user) return null
  if (!profile) return error ? <EmptyState message={error} /> : <Spinner label="Loading portal..." />

  const dueTotal = bills.reduce((s, b) => s + b.due_amount, 0)
  const statusColor = (s: string) => (s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : 'amber')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-700 p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-200 border border-emerald-700/30">
              Maitri Ayurveda Portal
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Namaste, {profile.full_name}!
            </h1>
            <p className="text-emerald-100/80 text-sm md:text-base max-w-xl">
              Your personalized healing dashboard. Track appointments, download prescriptions, view invoices, and manage your health journey.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/portal/appointments">
              <Button className="bg-white text-emerald-900 hover:bg-emerald-50 border-0 shadow-md transition-transform hover:-translate-y-0.5">
                <Calendar className="mr-2 h-4 w-4" /> Book Appointment
              </Button>
            </Link>
            <Link to="/portal/sessions">
              <Button className="bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/60 border border-emerald-700/30 transition-transform hover:-translate-y-0.5">
                <Activity className="mr-2 h-4 w-4" /> Therapy Sessions
              </Button>
            </Link>
            <Button variant="secondary" onClick={logout} className="bg-emerald-900/40 text-white hover:bg-emerald-900/60 border border-emerald-700/40">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {/* Profile Stats Quick Bar */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6 text-sm text-emerald-100/90">
          <div className="flex items-center gap-2.5">
            <User2 className="h-4.5 w-4.5 text-emerald-300" />
            <div>
              <p className="text-xs text-emerald-200/60 font-semibold uppercase">UHID</p>
              <p className="font-semibold">{profile.uhid}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Droplet className="h-4.5 w-4.5 text-emerald-300" />
            <div>
              <p className="text-xs text-emerald-200/60 font-semibold uppercase">Blood Group</p>
              <p className="font-semibold">{profile.blood_group || 'Not Specified'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="h-4.5 w-4.5 text-emerald-300" />
            <div>
              <p className="text-xs text-emerald-200/60 font-semibold uppercase">Mobile</p>
              <p className="font-semibold">{profile.mobile}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4.5 w-4.5 text-emerald-300" />
            <div>
              <p className="text-xs text-emerald-200/60 font-semibold uppercase">Gender & Age</p>
              <p className="font-semibold">{profile.gender}, {profile.age} yrs</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">{error}</div>}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/portal/appointments" className="group">
          <Card className="p-6 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-slate-100">
            <div className="absolute right-3 top-3 rounded-2xl bg-teal-50 p-3 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{appts.length}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">My Appointments</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 group-hover:underline">
              View & Book <ArrowRight className="h-3 w-3" />
            </span>
          </Card>
        </Link>

        <Link to="/portal/prescriptions" className="group">
          <Card className="p-6 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-slate-100">
            <div className="absolute right-3 top-3 rounded-2xl bg-indigo-50 p-3 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-3xl font-extrabold text-slate-800">{rx.length}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Prescriptions</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:underline">
              Check Treatment <ArrowRight className="h-3 w-3" />
            </span>
          </Card>
        </Link>

        <Link to="/portal/bills" className="group">
          <Card className="p-6 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-slate-100">
            <div className={`absolute right-3 top-3 rounded-2xl p-3 transition-colors ${dueTotal > 0 ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
              <IndianRupee className="h-6 w-6" />
            </div>
            <p className={`text-3xl font-extrabold ${dueTotal > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>₹{dueTotal.toFixed(2)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Outstanding Balance</p>
            <span className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${dueTotal > 0 ? 'text-rose-600' : 'text-emerald-700'} group-hover:underline`}>
              Invoices & Payments <ArrowRight className="h-3 w-3" />
            </span>
          </Card>
        </Link>

        <Link to="/portal/treatment-plans" className="group">
          <Card className="p-6 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-slate-100">
            <div className="absolute right-3 top-3 rounded-2xl bg-amber-50 p-3 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
              <Activity className="h-6 w-6" />
            </div>
            <p className="text-3xl font-extrabold text-slate-800">1</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Active Plans</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:underline">
              Track Progress <ArrowRight className="h-3 w-3" />
            </span>
          </Card>
        </Link>
      </div>

      {/* Main Dashboard Modules */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Recent Appointments */}
        <Card className="border-slate-100 shadow-sm">
          <CardHeader
            title="Recent Visits"
            subtitle="Your scheduled and completed visits"
            action={
              <Link to="/portal/appointments" className="text-sm font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {appts.length === 0 ? (
            <div className="py-12"><EmptyState message="No appointments yet" /></div>
          ) : (
            <div className="divide-y divide-slate-100 px-6 pb-6">
              {appts.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{a.doctor_name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.appointment_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400">Token #{a.token_number} • Reason: {a.reason || 'Routine consultation'}</p>
                  </div>
                  <Badge color={statusColor(a.status)}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Prescriptions */}
        <Card className="border-slate-100 shadow-sm">
          <CardHeader
            title="Active Prescriptions"
            subtitle="Treatments and medications recommended by doctors"
            action={
              <Link to="/portal/prescriptions" className="text-sm font-semibold text-indigo-700 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {rx.length === 0 ? (
            <div className="py-12"><EmptyState message="No prescriptions recommended yet" /></div>
          ) : (
            <div className="divide-y divide-slate-100 px-6 pb-6">
              {rx.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{r.doctor}</p>
                    <p className="text-xs text-slate-500">
                      Prescribed on {new Date(r.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-400 italic">Notes: {r.notes || 'No special instructions'}</p>
                  </div>
                  <Badge color={r.status === 'DISPENSED' ? 'green' : r.status === 'PARTIALLY_DISPENSED' ? 'amber' : 'blue'}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
