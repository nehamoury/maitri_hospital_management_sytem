import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { AdminStatCard, AdminQuickAction, AdminSectionHeader, AdminAlertCard, AdminSkeleton } from '../../design-system/AdminComponents'
import {
  Users, Calendar, Stethoscope, Building2, UserPlus, CalendarPlus,
  ArrowLeftRight, Receipt, Activity, AlertTriangle, Clock,
  Pill, FileText, ClipboardList, UserCheck, CreditCard, Banknote,
  Search, PillIcon, Package
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '../../lib/utils'

interface DashboardData {
  todays_patients_count: number
  todays_appointments_count: number
  department_count: number
  active_doctors_count: number
  recent_registrations: {
    id: string
    uhid: string
    full_name: string
    mobile: string
    created_at: string
  }[]
  todays_appointments: {
    id: string
    patient_name: string
    doctor_name: string
    token_number: number
    status: string
  }[]
}

interface Medicine {
  id: string
  name: string
  stock_qty: number
  unit: string
  low_stock: boolean
  is_expired: boolean
  near_expiry: boolean
  batch_number: string
}

interface Bill {
  id: string
  bill_no: string
  patient_name: string
  total_amount: number
  paid_amount: number
  payment_status: string
  created_at: string
}

interface EncounterLight {
  id: string
  encounter_type: string
  status: string
}

const CHART_COLORS = ['#0F766E', '#14B8A6', '#C8A14D', '#6366F1', '#F59E0B', '#EC4899']

const ADMIN_ROLES = ['SUPER_ADMIN', 'HOSPITAL_ADMIN']

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role_name ?? ''
  const userName = user?.full_name ?? ''
  const isAdmin = ADMIN_ROLES.includes(role)

  const [data, setData] = useState<DashboardData | null>(null)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [encounters, setEncounters] = useState<EncounterLight[]>([])
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const d = new Date()
  const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  useEffect(() => {
    api
      .get<{ data: DashboardData }>('/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load dashboard')))
  }, [])

  // Fetch role-specific data
  useEffect(() => {
    if (role === 'PHARMACIST') {
      api.get<{ data: Medicine[] }>('/medicines').then((r) => setMedicines(r.data.data)).catch(() => {})
    }
    if (role === 'BILLING_ACCOUNTS' || isAdmin) {
      api.get<{ data: Bill[] }>('/bills').then((r) => setBills(r.data.data)).catch(() => {})
    }
    if (isAdmin || role === 'RECEPTIONIST' || role === 'DOCTOR' || role === 'PANCHAKARMA_DOCTOR') {
      api.get<{ data: EncounterLight[] }>(`/encounters?date=${todayISO}`).then((r) => setEncounters(r.data.data)).catch(() => {})
    }
  }, [role, isAdmin, todayISO])

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:bg-red-950/20 dark:border-red-900/30">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    </div>
  )
  if (!data) return <AdminSkeleton rows={4} />

  const statusColor = (s: string) => {
    switch (s) {
      case 'COMPLETED':
        return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30'
      case 'CANCELLED':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
      case 'IN_CONSULTATION':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30'
      default:
        return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30'
    }
  }

  const lowStockMeds = medicines.filter((m) => m.low_stock && !m.is_expired)
  const waitingCount = encounters.filter((e) => e.status === 'REGISTERED' || e.status === 'WAITING').length
  const inConsultCount = encounters.filter((e) => e.status === 'IN_CONSULTATION').length
  const completedTodayCount = encounters.filter((e) => e.status === 'COMPLETED').length
  const pendingBills = bills.filter((b) => b.payment_status === 'UNPAID' || b.payment_status === 'PARTIAL')
  const todayBills = bills.filter((b) => {
    const bd = new Date(b.created_at)
    const today = new Date()
    return bd.toDateString() === today.toDateString()
  })
  const todayRevenue = todayBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0)

  // Greeting based on time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-5 gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400 mb-1">
            {role.replace(/_/g, ' ')} / OVERVIEW
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your daily operations, clinical workflows, and system notifications.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-2 ring-1 ring-border">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-medium">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* ==================== ADMIN / HOSPITAL_ADMIN ==================== */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard title="Today's Patients" value={data.todays_patients_count} icon={<Users className="h-6 w-6" />} color="emerald" subtitle="Registered today" />
            <AdminStatCard title="Appointments" value={data.todays_appointments_count} icon={<Calendar className="h-6 w-6" />} color="blue" subtitle="Scheduled today" />
            <AdminStatCard title="Departments" value={data.department_count} icon={<Building2 className="h-6 w-6" />} color="amber" subtitle="Active departments" />
            <AdminStatCard title="Active Doctors" value={data.active_doctors_count} icon={<Stethoscope className="h-6 w-6" />} color="purple" subtitle="Available today" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard title="Today's Revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} icon={<Banknote className="h-6 w-6" />} color="emerald" subtitle="Collected today" />
            <AdminStatCard title="Pending Bills" value={pendingBills.length} icon={<CreditCard className="h-6 w-6" />} color="amber" subtitle="Awaiting payment" />
            <AdminStatCard title="In Consultation" value={inConsultCount} icon={<Activity className="h-6 w-6" />} color="blue" subtitle="Currently with doctor" />
            <AdminStatCard title="Completed Today" value={completedTodayCount} icon={<UserCheck className="h-6 w-6" />} color="purple" subtitle="OPD visits finished" />
          </div>
          <AdminSectionHeader title="Quick Actions" subtitle="Frequently used actions" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminQuickAction label="Register Patient" icon={<UserPlus className="h-5 w-5" />} onClick={() => navigate('/admin/patients/new')} color="emerald" />
            <AdminQuickAction label="Book Appointment" icon={<CalendarPlus className="h-5 w-5" />} onClick={() => navigate('/admin/appointments')} color="blue" />
            <AdminQuickAction label="Create Referral" icon={<ArrowLeftRight className="h-5 w-5" />} onClick={() => navigate('/admin/referrals')} color="amber" />
            <AdminQuickAction label="New Bill" icon={<Receipt className="h-5 w-5" />} onClick={() => navigate('/admin/billing')} color="purple" />
          </div>
        </>
      )}

      {/* ==================== RECEPTIONIST ==================== */}
      {role === 'RECEPTIONIST' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard title="Today's Appointments" value={data.todays_appointments_count} icon={<Calendar className="h-6 w-6" />} color="blue" subtitle="Scheduled today" />
            <AdminStatCard title="New Patients" value={data.todays_patients_count} icon={<Users className="h-6 w-6" />} color="emerald" subtitle="Registered today" />
            <AdminStatCard title="Departments" value={data.department_count} icon={<Building2 className="h-6 w-6" />} color="amber" subtitle="Active" />
            <AdminStatCard title="Active Doctors" value={data.active_doctors_count} icon={<Stethoscope className="h-6 w-6" />} color="purple" subtitle="Available" />
          </div>
          <AdminSectionHeader title="Quick Actions" subtitle="Front desk operations" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminQuickAction label="Register Patient" icon={<UserPlus className="h-5 w-5" />} onClick={() => navigate('/admin/patients/new')} color="emerald" />
            <AdminQuickAction label="Book Appointment" icon={<CalendarPlus className="h-5 w-5" />} onClick={() => navigate('/admin/appointments')} color="blue" />
            <AdminQuickAction label="New Encounter" icon={<ClipboardList className="h-5 w-5" />} onClick={() => navigate('/admin/encounters')} color="amber" />
            <AdminQuickAction label="View Patients" icon={<Search className="h-5 w-5" />} onClick={() => navigate('/admin/patients')} color="purple" />
          </div>
        </>
      )}

      {/* ==================== DOCTOR ==================== */}
      {(role === 'DOCTOR' || role === 'PANCHAKARMA_DOCTOR') && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard title="Today's Appointments" value={data.todays_appointments_count} icon={<Calendar className="h-6 w-6" />} color="blue" subtitle="Your schedule" />
            <AdminStatCard title="Patients Today" value={data.todays_patients_count} icon={<Users className="h-6 w-6" />} color="emerald" subtitle="In your OPD" />
            <AdminStatCard title="Departments" value={data.department_count} icon={<Building2 className="h-6 w-6" />} color="amber" subtitle="Active" />
            <AdminStatCard title="Active Doctors" value={data.active_doctors_count} icon={<Stethoscope className="h-6 w-6" />} color="purple" subtitle="Colleagues" />
          </div>
          <AdminSectionHeader title="Quick Actions" subtitle="Clinical workflow" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminQuickAction label="View Encounters" icon={<Stethoscope className="h-5 w-5" />} onClick={() => navigate('/admin/encounters')} color="emerald" />
            <AdminQuickAction label="View Patients" icon={<Users className="h-5 w-5" />} onClick={() => navigate('/admin/patients')} color="blue" />
            <AdminQuickAction label="Referrals" icon={<ArrowLeftRight className="h-5 w-5" />} onClick={() => navigate('/admin/referrals')} color="amber" />
            <AdminQuickAction label="Pharmacy" icon={<Pill className="h-5 w-5" />} onClick={() => navigate('/admin/pharmacy')} color="purple" />
          </div>
        </>
      )}

      {/* ==================== PHARMACIST ==================== */}
      {role === 'PHARMACIST' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard title="Total Medicines" value={medicines.length} icon={<Pill className="h-6 w-6" />} color="emerald" subtitle="In inventory" />
            <AdminStatCard title="Low Stock" value={lowStockMeds.length} icon={<AlertTriangle className="h-6 w-6" />} color="red" subtitle="Need restocking" />
            <AdminStatCard title="Near Expiry" value={medicines.filter((m) => m.near_expiry).length} icon={<Clock className="h-6 w-6" />} color="amber" subtitle="Within 3 months" />
            <AdminStatCard title="Expired" value={medicines.filter((m) => m.is_expired).length} icon={<Package className="h-6 w-6" />} color="red" subtitle="Cannot dispense" />
          </div>
          <AdminSectionHeader title="Quick Actions" subtitle="Pharmacy operations" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminQuickAction label="Dispense Medicine" icon={<PillIcon className="h-5 w-5" />} onClick={() => navigate('/admin/pharmacy')} color="emerald" />
            <AdminQuickAction label="View Inventory" icon={<Package className="h-5 w-5" />} onClick={() => navigate('/admin/pharmacy')} color="blue" />
            <AdminQuickAction label="Add Medicine" icon={<UserPlus className="h-5 w-5" />} onClick={() => navigate('/admin/pharmacy')} color="amber" />
            <AdminQuickAction label="View Patients" icon={<Users className="h-5 w-5" />} onClick={() => navigate('/admin/patients')} color="purple" />
          </div>
          {/* Low Stock Alert */}
          {lowStockMeds.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:bg-red-950/10 dark:border-red-900/30">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-semibold text-red-750">Low Stock Medicines ({lowStockMeds.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-xs text-red-500/80 border-b border-red-100 dark:border-red-950/30">
                      <th className="pb-2 pr-4 font-semibold uppercase tracking-wider">Medicine</th>
                      <th className="pb-2 pr-4 font-semibold uppercase tracking-wider">Batch</th>
                      <th className="pb-2 font-semibold uppercase tracking-wider">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100/50 dark:divide-red-950/20">
                    {lowStockMeds.slice(0, 5).map((m) => (
                      <tr key={m.id}>
                        <td className="py-2.5 pr-4 font-medium text-red-800 dark:text-red-300">{m.name}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-red-600 dark:text-red-400">{m.batch_number || '—'}</td>
                        <td className="py-2.5 font-bold text-red-700 dark:text-red-400">{m.stock_qty} {m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lowStockMeds.length > 5 && (
                  <p className="mt-2 text-xs text-red-500">+ {lowStockMeds.length - 5} more medicines low on stock</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== BILLING ==================== */}
      {role === 'BILLING_ACCOUNTS' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard title="Today's Bills" value={todayBills.length} icon={<Receipt className="h-6 w-6" />} color="blue" subtitle="Created today" />
            <AdminStatCard title="Pending Payments" value={pendingBills.length} icon={<CreditCard className="h-6 w-6" />} color="amber" subtitle="Awaiting payment" />
            <AdminStatCard title="Today's Revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} icon={<Banknote className="h-6 w-6" />} color="emerald" subtitle="Collected today" />
            <AdminStatCard title="Total Bills" value={bills.length} icon={<FileText className="h-6 w-6" />} color="purple" subtitle="All time" />
          </div>
          <AdminSectionHeader title="Quick Actions" subtitle="Billing operations" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminQuickAction label="New Bill" icon={<Receipt className="h-5 w-5" />} onClick={() => navigate('/admin/billing')} color="emerald" />
            <AdminQuickAction label="View All Bills" icon={<FileText className="h-5 w-5" />} onClick={() => navigate('/admin/billing')} color="blue" />
            <AdminQuickAction label="View Patients" icon={<Users className="h-5 w-5" />} onClick={() => navigate('/admin/patients')} color="amber" />
            <AdminQuickAction label="Dashboard" icon={<Activity className="h-5 w-5" />} onClick={() => navigate('/admin')} color="purple" />
          </div>
          {/* Pending Payments */}
          {pendingBills.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:bg-amber-950/10 dark:border-amber-900/30">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-amber-700">Pending Payments ({pendingBills.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-xs text-amber-500/80 border-b border-amber-100 dark:border-amber-950/30">
                      <th className="pb-2 pr-4 font-semibold uppercase tracking-wider">Bill No</th>
                      <th className="pb-2 pr-4 font-semibold uppercase tracking-wider">Patient</th>
                      <th className="pb-2 pr-4 font-semibold uppercase tracking-wider">Amount</th>
                      <th className="pb-2 font-semibold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/50 dark:divide-amber-950/20">
                    {pendingBills.slice(0, 5).map((b) => (
                      <tr key={b.id}>
                        <td className="py-2.5 pr-4 font-mono text-xs text-amber-700 dark:text-amber-400">{b.bill_no}</td>
                        <td className="py-2.5 pr-4 font-medium text-amber-850 dark:text-amber-300">{b.patient_name}</td>
                        <td className="py-2.5 pr-4 font-mono text-amber-700 dark:text-amber-400">₹{b.total_amount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">{b.payment_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingBills.length > 5 && (
                  <p className="mt-2 text-xs text-amber-500">+ {pendingBills.length - 5} more pending bills</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== NURSE / THERAPIST / WARD / DIET / LAB ==================== */}
      {['NURSE', 'THERAPIST', 'WARD_STAFF', 'DIET_KITCHEN', 'LAB_STAFF'].includes(role) && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard title="Today's Patients" value={data.todays_patients_count} icon={<Users className="h-6 w-6" />} color="emerald" subtitle="In hospital" />
            <AdminStatCard title="Active Encounters" value={data.todays_appointments_count} icon={<ClipboardList className="h-6 w-6" />} color="blue" subtitle="Open visits" />
            <AdminStatCard title="Departments" value={data.department_count} icon={<Building2 className="h-6 w-6" />} color="amber" subtitle="Active" />
            <AdminStatCard title="Doctors On Duty" value={data.active_doctors_count} icon={<Stethoscope className="h-6 w-6" />} color="purple" subtitle="Available" />
          </div>
          <AdminSectionHeader title="Quick Actions" subtitle="Daily tasks" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminQuickAction label="View Patients" icon={<Users className="h-5 w-5" />} onClick={() => navigate('/admin/patients')} color="emerald" />
            <AdminQuickAction label="View Encounters" icon={<Stethoscope className="h-5 w-5" />} onClick={() => navigate('/admin/encounters')} color="blue" />
            <AdminQuickAction label="View Doctors" icon={<UserCheck className="h-5 w-5" />} onClick={() => navigate('/admin/doctors')} color="amber" />
            <AdminQuickAction label="View Departments" icon={<Building2 className="h-5 w-5" />} onClick={() => navigate('/admin/departments')} color="purple" />
          </div>
        </>
      )}

      {/* ==================== COMMON: Charts + Tables (Admin/Receptionist/Doctor) ==================== */}
      {(isAdmin || role === 'RECEPTIONIST' || role === 'DOCTOR' || role === 'PANCHAKARMA_DOCTOR') && (
        <>
          {/* Charts + Alerts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Today's OPD Overview</h3>
                  <p className="text-xs text-muted-foreground">Appointment status distribution</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <Activity className="h-3.5 w-3.5" />
                  Live Queue
                </div>
              </div>
              {data.todays_appointments.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.todays_appointments.reduce((acc, a) => {
                      const status = a.status === 'COMPLETED' ? 'Completed' : a.status === 'CANCELLED' ? 'Cancelled' : 'Scheduled'
                      const existing = acc.find(d => d.name === status)
                      if (existing) existing.value++
                      else acc.push({ name: status, value: 1 })
                      return acc
                    }, [] as { name: string; value: number }[])}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {data.todays_appointments.reduce((acc, a) => {
                          const status = a.status === 'COMPLETED' ? 'Completed' : a.status === 'CANCELLED' ? 'Cancelled' : 'Scheduled'
                          if (!acc.find(d => d.name === status)) acc.push({ name: status, value: 0 })
                          return acc
                        }, [] as { name: string; value: number }[]).map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">No appointment data today</div>
              )}
            </div>
            <div className="space-y-4">
              <AdminAlertCard
                title="Today's OPD Queue"
                icon={<Activity className="h-4 w-4" />}
                color="blue"
                items={[
                  { label: 'Waiting', value: String(waitingCount), color: 'text-amber-600 dark:text-amber-400' },
                  { label: 'In Consultation', value: String(inConsultCount), color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Completed', value: String(completedTodayCount), color: 'text-emerald-600 dark:text-emerald-400' },
                ]}
              />
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Recent Registrations</h3>
                  <p className="text-xs text-muted-foreground">Latest patient registrations</p>
                </div>
                <Link to="/admin/patients" className="text-xs font-medium text-primary hover:underline">View all →</Link>
              </div>
              {data.recent_registrations.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No patients registered yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">UHID</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.recent_registrations.map((p) => (
                        <tr key={p.id} className="transition-colors hover:bg-muted/30">
                          <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-primary font-semibold">{p.uhid}</td>
                          <td className="px-5 py-3">
                            <Link to={`/admin/patients/${p.id}`} className="font-semibold text-foreground hover:text-primary">{p.full_name}</Link>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{p.mobile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Today's Appointments</h3>
                  <p className="text-xs text-muted-foreground">OPD schedule</p>
                </div>
                <Link to="/admin/appointments" className="text-xs font-medium text-primary hover:underline">View all →</Link>
              </div>
              {data.todays_appointments.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No appointments today</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Token</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doctor</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.todays_appointments.map((a) => (
                        <tr key={a.id} className="transition-colors hover:bg-muted/30">
                          <td className="whitespace-nowrap px-5 py-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">{a.token_number}</span>
                          </td>
                          <td className="px-5 py-3 font-semibold text-foreground">{a.patient_name}</td>
                          <td className="px-5 py-3 text-muted-foreground">{a.doctor_name}</td>
                          <td className="px-5 py-3">
                            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(a.status))}>{a.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
