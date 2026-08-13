import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Check, User, Building2 } from 'lucide-react'
import { portalApi, errorMessage } from '../../lib/api'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, Button, Input } from '../../components/ui'

interface Appt {
  id: string
  doctor_id: string
  doctor_name: string
  appointment_date: string
  token_number: number
  status: string
  reason: string
}

interface Doctor {
  id: string
  name: string
  department: string
}

interface Department {
  id: string
  name: string
  is_active: boolean
}

export default function PortalAppointments() {
  const [appts, setAppts] = useState<Appt[] | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Custom dropdown states
  const [isDeptOpen, setIsDeptOpen] = useState(false)
  const [isDocOpen, setIsDocOpen] = useState(false)

  const deptRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({ 
    doctor_id: '', 
    appointment_date: new Date().toISOString().slice(0, 10), 
    reason: '' 
  })

  const load = () => {
    portalApi
      .get<{ data: Appt[] }>('/portal/appointments')
      .then((res) => setAppts(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load appointments')))
  }

  useEffect(() => {
    load()
    portalApi
      .get<{ data: Doctor[] }>('/public/doctors')
      .then((res) => setDoctors(res.data.data || []))
      .catch(() => {})
    portalApi
      .get<{ data: Department[] }>('/departments')
      .then((res) => setDepartments(res.data.data.filter((d) => d.is_active)))
      .catch(() => {})

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(event.target as Node)) {
        setIsDeptOpen(false)
      }
      if (docRef.current && !docRef.current.contains(event.target as Node)) {
        setIsDocOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter doctors based on selected department
  const filteredDoctors = useMemo(() => {
    if (!selectedDeptId) return doctors
    const dept = departments.find(d => d.id === selectedDeptId)
    if (!dept) return doctors
    return doctors.filter(doc => doc.department.toLowerCase() === dept.name.toLowerCase())
  }, [doctors, selectedDeptId, departments])

  const selectedDeptName = useMemo(() => {
    const dept = departments.find(d => d.id === selectedDeptId)
    return dept ? dept.name : 'All Departments'
  }, [selectedDeptId, departments])

  const selectedDoctorName = useMemo(() => {
    const doc = doctors.find(d => d.id === form.doctor_id)
    return doc ? `${doc.name} (${doc.department})` : 'Select doctor'
  }, [form.doctor_id, doctors])

  const book = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.doctor_id) {
      setError('Please select a doctor')
      return
    }
    setLoading(true)
    setError('')
    try {
      await portalApi.post('/portal/appointments', form)
      setForm({ ...form, doctor_id: '', reason: '' })
      setSelectedDeptId('')
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to book appointment'))
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (s: string) => (s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : 'amber')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white shadow-lg mb-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 border border-emerald-700/20">
              Maitri Ayurveda Portal
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">My Appointments</h1>
            <p className="text-emerald-100/70 text-xs md:text-sm">Book and track your consultations</p>
          </div>
          <Link to="/portal" className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors border border-white/10">
            ← Dashboard
          </Link>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card className="mb-6 overflow-visible">
        <CardHeader title="Book New Appointment" />
        <form onSubmit={book} className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            
            {/* Custom Department Dropdown */}
            <div className="relative" ref={deptRef}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Department</label>
              <button
                type="button"
                onClick={() => setIsDeptOpen(!isDeptOpen)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-700 transition-all hover:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              >
                <span className="truncate flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                  {selectedDeptName}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDeptOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDeptOpen && (
                <div className="absolute left-0 z-50 mt-1 w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeptId('')
                      setForm({ ...form, doctor_id: '' })
                      setIsDeptOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 hover:text-teal-700 ${!selectedDeptId ? 'bg-teal-50/30 text-teal-700 font-semibold' : 'text-slate-600'}`}
                  >
                    All Departments
                    {!selectedDeptId && <Check className="h-4 w-4" />}
                  </button>
                  {departments.map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => {
                        setSelectedDeptId(d.id)
                        setForm({ ...form, doctor_id: '' })
                        setIsDeptOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 hover:text-teal-700 ${selectedDeptId === d.id ? 'bg-teal-50/30 text-teal-700 font-semibold' : 'text-slate-600'}`}
                    >
                      {d.name}
                      {selectedDeptId === d.id && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Doctor Dropdown */}
            <div className="relative" ref={docRef}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Doctor *</label>
              <button
                type="button"
                onClick={() => setIsDocOpen(!isDocOpen)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-700 transition-all hover:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              >
                <span className="truncate flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  {selectedDoctorName}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDocOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDocOpen && (
                <div className="absolute left-0 z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                  {filteredDoctors.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">No doctors available</p>
                  ) : (
                    filteredDoctors.map((d) => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => {
                          setForm({ ...form, doctor_id: d.id })
                          setIsDocOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 hover:text-teal-700 ${form.doctor_id === d.id ? 'bg-teal-50/30 text-teal-700 font-semibold' : 'text-slate-600'}`}
                      >
                        <div>
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-[10px] text-slate-400">{d.department}</p>
                        </div>
                        {form.doctor_id === d.id && <Check className="h-4 w-4 text-teal-700" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Date *</label>
              <Input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} required />
            </div>

            <div className="relative">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Reason</label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Chief complaints" />
            </div>

          </div>

          <div className="flex justify-start">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Booking...' : 'Book Appointment'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {!appts ? (
          <Spinner label="Loading appointments..." />
        ) : appts.length === 0 ? (
          <EmptyState message="No appointments yet" />
        ) : (
          <Table headers={['Date', 'Token', 'Doctor', 'Reason', 'Status']}>
            {appts.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{new Date(a.appointment_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.token_number}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{a.doctor_name}</td>
                <td className="px-4 py-3 text-slate-600">{a.reason || '—'}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(a.status)}>{a.status}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
