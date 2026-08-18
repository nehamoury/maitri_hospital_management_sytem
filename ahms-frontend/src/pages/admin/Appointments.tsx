import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'
import { Search, Calendar, Filter, X, CalendarPlus } from 'lucide-react'

interface Appointment {
  id: string
  patient_id: string
  patient_name: string
  patient_uhid: string
  doctor_id: string
  doctor_name: string
  appointment_date: string
  token_number: number
  status: string
  reason: string
}

interface Patient {
  id: string
  full_name: string
  uhid: string
}

interface Doctor {
  id: string
  full_name: string
  department_id: string
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [form, setForm] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().slice(0, 10),
    reason: '',
  })

  const load = () => {
    api
      .get<{ data: Appointment[] }>('/appointments')
      .then((res) => setAppointments(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load appointments')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Patient[] }>('/patients').then((res) => setPatients(res.data.data)).catch(() => {})
    api.get<{ data: Doctor[] }>('/doctors').then((res) => setDoctors(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const handleUpdate = () => load()
    window.addEventListener('appointment_updated', handleUpdate)
    return () => window.removeEventListener('appointment_updated', handleUpdate)
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/appointments', form)
      setShowForm(false)
      setForm({ ...form, patient_id: '', doctor_id: '', reason: '' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to book appointment'))
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (appt: Appointment, status: string) => {
    try {
      if (status === 'COMPLETED') {
        const doc = doctors.find((d) => d.id === appt.doctor_id)
        if (doc) {
          try {
            await api.post('/encounters', {
              patient_id: appt.patient_id,
              department_id: doc.department_id,
              doctor_id: appt.doctor_id,
              encounter_type: 'OPD',
              visit_type: 'NEW',
              visit_date: appt.appointment_date,
              consultation_fee: 0,
            })
          } catch (e) {
            console.error('Failed to auto-create encounter', e)
          }
        }
      }
      await api.put(`/appointments/${appt.id}/status`, { status })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update status'))
    }
  }

  const filteredAppointments = useMemo(() => {
    if (!appointments) return []

    const sorted = [...appointments].sort((a, b) => {
      const dateA = new Date(a.appointment_date).getTime()
      const dateB = new Date(b.appointment_date).getTime()
      if (dateB !== dateA) {
        return dateB - dateA
      }
      return a.token_number - b.token_number
    })

    return sorted.filter((a) => {
      const matchSearch = searchQuery === '' || 
        a.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.patient_uhid.toLowerCase().includes(searchQuery.toLowerCase())

      const matchDate = dateFilter === '' || a.appointment_date.startsWith(dateFilter)
      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter

      return matchSearch && matchDate && matchStatus
    })
  }, [appointments, searchQuery, dateFilter, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, dateFilter, statusFilter])

  const totalPages = Math.ceil(filteredAppointments.length / pageSize)
  
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAppointments.slice(start, start + pageSize)
  }, [filteredAppointments, currentPage])

  const statusColor = (s: string) => {
    switch (s) {
      case 'COMPLETED':
        return 'green'
      case 'CANCELLED':
        return 'red'
      default:
        return 'amber'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Manage scheduled patient visits, doctor allocations, and token queue."
        action={
          <Can permission="appointment.create">
            <Button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 shadow-sm">
              <CalendarPlus className="h-4.5 w-4.5" />
              {showForm ? 'Cancel Booking' : 'Book Appointment'}
            </Button>
          </Can>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-6 animate-in fade-in slide-in-from-top-2 duration-150">
          <CardHeader title="Book Appointment Record" />
          <form onSubmit={create} className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Select Patient *">
              <Select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
                <option value="">Select a registered patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.uhid})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Select Doctor *">
              <Select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} required>
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Appointment Date *">
              <Input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} required />
            </Field>
            <Field label="Reason / Chief Complaints">
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Chronic back pain, Nadi consultation" />
            </Field>
            <div className="sm:col-span-2 pt-2 border-t border-border mt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Booking...' : 'Book Appointment'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters & Search Controls */}
      <div className="grid gap-4 sm:grid-cols-3 bg-muted/20 border border-border p-4 rounded-2xl">
        <Field label="Search Query">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, doctor, UHID..."
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </Field>
        <Field label="Filter by Date">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Calendar className="h-4 w-4" />
            </span>
            <Input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </Field>
        <Field label="Filter by Status">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Filter className="h-4 w-4" />
            </span>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pl-9">
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </Select>
          </div>
        </Field>
      </div>

      <Card>
        {!appointments ? (
          <Spinner label="Loading appointments log..." />
        ) : paginatedAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-semibold text-foreground">No appointments found</p>
            <p className="text-xs text-muted-foreground mt-1">No scheduled slots matched your current filter selection criteria.</p>
            {(searchQuery || dateFilter || statusFilter !== 'ALL') && (
              <Button variant="secondary" onClick={() => { setSearchQuery(''); setDateFilter(''); setStatusFilter('ALL') }} className="mt-4">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div>
            <Table headers={['Date', 'Token', 'Patient', 'Doctor', 'Status', 'Actions']}>
              {paginatedAppointments.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.appointment_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground font-mono">{a.token_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <LinkPatient id={a.patient_id} name={a.patient_name} uhid={a.patient_uhid} />
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium text-xs">{a.doctor_name}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor(a.status)}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'SCHEDULED' && (
                      <Can permission="appointment.update">
                        <div className="flex gap-3">
                          <button onClick={() => updateStatus(a, 'COMPLETED')} className="text-xs font-bold text-primary hover:underline cursor-pointer">
                            Complete
                          </button>
                          <button onClick={() => updateStatus(a, 'CANCELLED')} className="text-xs font-bold text-destructive hover:underline cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      </Can>
                    )}
                    {a.status !== 'SCHEDULED' && <span className="text-xs text-muted-foreground/60">—</span>}
                  </td>
                </tr>
              ))}
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/10">
                <span className="text-xs text-muted-foreground font-medium">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAppointments.length)} of {filteredAppointments.length} appointments
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function LinkPatient({ id, name, uhid }: { id: string; name: string; uhid: string }) {
  return (
    <Link to={`/admin/patients/${id}`} className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
      {name}
      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{uhid}</span>
    </Link>
  )
}
