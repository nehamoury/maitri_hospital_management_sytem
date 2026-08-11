import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

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

  // Filtered & Sorted Appointments list
  const filteredAppointments = useMemo(() => {
    if (!appointments) return []

    // Sort: Latest date first, then lowest token number first (1, 2, 3...)
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

  // Reset pagination to page 1 on filter update
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, dateFilter, statusFilter])

  const totalPages = Math.ceil(filteredAppointments.length / pageSize)
  
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAppointments.slice(start, start + pageSize)
  }, [filteredAppointments, currentPage])

  const statusColor = (s: string) =>
    s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : 'amber'

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Schedule and manage patient appointments"
        action={
          <Can permission="appointment.create">
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ Book Appointment'}</Button>
          </Can>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="Book Appointment" />
          <form onSubmit={create} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Patient *">
              <Select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.uhid})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Doctor *">
              <Select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} required>
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date *">
              <Input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} required />
            </Field>
            <Field label="Reason">
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Booking...' : 'Book Appointment'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters & Search Controls */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Field label="Search Patient/Doctor">
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or UHID..."
          />
        </Field>
        <Field label="Filter by Date">
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </Field>
        <Field label="Filter by Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>
        </Field>
      </div>

      <Card>
        {!appointments ? (
          <Spinner label="Loading appointments..." />
        ) : paginatedAppointments.length === 0 ? (
          <EmptyState message="No appointments found matching filters" />
        ) : (
          <div>
            <Table headers={['Date', 'Token', 'Patient', 'Doctor', 'Status', 'Actions']}>
              {paginatedAppointments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.token_number}</td>
                  <td className="px-4 py-3">
                    <LinkPatient id={a.patient_id} name={a.patient_name} uhid={a.patient_uhid} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.doctor_name}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor(a.status)}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'SCHEDULED' && (
                      <Can permission="appointment.update">
                        <div className="flex gap-3">
                          <button onClick={() => updateStatus(a, 'COMPLETED')} className="text-sm font-semibold text-emerald-700 hover:underline">
                            Complete
                          </button>
                          <button onClick={() => updateStatus(a, 'CANCELLED')} className="text-sm font-semibold text-red-600 hover:underline">
                            Cancel
                          </button>
                        </div>
                      </Can>
                    )}
                    {a.status !== 'SCHEDULED' && <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <span className="text-sm text-slate-500">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAppointments.length)} of {filteredAppointments.length} appointments
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs font-semibold"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs font-semibold"
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
    <Link to={`/admin/patients/${id}`} className="font-medium text-slate-800 hover:text-emerald-700">
      {name}
      <span className="ml-1 font-mono text-xs text-slate-400">{uhid}</span>
    </Link>
  )
}
