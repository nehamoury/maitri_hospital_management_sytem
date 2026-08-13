import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Select, Input, Field } from '../../components/ui'

interface Encounter {
  id: string
  patient_id: string
  uhid: string
  patient_name: string
  department_id: string
  department_name: string
  doctor_id: string
  doctor_name: string
  encounter_type: string
  visit_type: string
  visit_date: string
  token_number: number
  status: string
  consultation_fee: number
  payment_status: string
}

interface Patient {
  id: string
  full_name: string
  uhid: string
}

interface Doctor {
  id: string
  full_name: string
}

interface Department {
  id: string
  name: string
}

export default function Encounters() {
  const [encounters, setEncounters] = useState<Encounter[] | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [form, setForm] = useState({
    patient_id: '',
    department_id: '',
    doctor_id: '',
    encounter_type: 'OPD',
    visit_type: 'NEW',
    visit_date: new Date().toISOString().slice(0, 10),
    consultation_fee: '',
    referral_id: '',
  })

  const load = () => {
    api
      .get<{ data: Encounter[] }>('/encounters')
      .then((res) => setEncounters(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load encounters')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Patient[] }>('/patients').then((res) => setPatients(res.data.data)).catch(() => {})
    api.get<{ data: Doctor[] }>('/doctors').then((res) => setDoctors(res.data.data)).catch(() => {})
    api.get<{ data: Department[] }>('/departments').then((res) => setDepartments(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterDate])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : 0,
        referral_id: form.referral_id || undefined,
      }
      await api.post('/encounters', payload)
      setShowForm(false)
      setForm({ ...form, patient_id: '', department_id: '', doctor_id: '', consultation_fee: '', referral_id: '' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to create encounter'))
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (s: string) =>
    s === 'COMPLETED' ? 'green' : s === 'IN_CONSULTATION' ? 'blue' : s === 'WAITING' ? 'amber' : 'slate'

  const filteredEncounters = encounters?.filter((e) => {
    const matchesName = searchTerm
      ? (e.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         e.uhid?.toLowerCase().includes(searchTerm.toLowerCase()))
      : true
    const matchesDate = filterDate
      ? new Date(e.visit_date).toISOString().slice(0, 10) === filterDate
      : true
    return matchesName && matchesDate
  }) || []

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredEncounters.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedEncounters = filteredEncounters.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div>
      <PageHeader
        title="Encounters"
        subtitle="OPD/IPD visits and registration"
        action={
          <Can permission="encounter.create">
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ New Encounter'}</Button>
          </Can>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="New Encounter" />
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
            <Field label="Department *">
              <Select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} required>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
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
            <Field label="Consultation Fee">
              <Input type="number" min={0} value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} />
            </Field>
            <Field label="Type">
              <Select value={form.encounter_type} onChange={(e) => setForm({ ...form, encounter_type: e.target.value })}>
                <option value="OPD">OPD</option>
                <option value="IPD">IPD</option>
              </Select>
            </Field>
            <Field label="Visit Type">
              <Select value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value })}>
                <option value="NEW">New</option>
                <option value="FOLLOW_UP">Follow-up</option>
              </Select>
            </Field>
            <Field label="Visit Date">
              <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Encounter'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search by patient name or UHID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        {(searchTerm || filterDate) && (
          <Button
            variant="secondary"
            onClick={() => {
              setSearchTerm('')
              setFilterDate('')
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <Card>
        {!encounters ? (
          <Spinner label="Loading encounters..." />
        ) : filteredEncounters.length === 0 ? (
          <EmptyState message="No encounters found" />
        ) : (
          <div>
            <div className="overflow-y-auto max-h-[550px] border border-slate-100 rounded-t-lg">
              <Table headers={['Date', 'Token', 'Patient', 'Department', 'Doctor', 'Type', 'Status', 'Actions']}>
                {paginatedEncounters.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{new Date(e.visit_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.token_number}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/patients/${e.patient_id}`} className="font-medium text-slate-800 hover:text-emerald-700">
                        {e.patient_name?.trim() ? e.patient_name : <span className="italic text-slate-400">Unnamed Patient</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.department_name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.doctor_name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.encounter_type}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(e.status)}>{e.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 text-sm">
                        <Link to={`/admin/encounters/${e.id}/consultation`} className="text-emerald-700 hover:underline">
                          Consultation
                        </Link>
                        <Link to={`/admin/encounters/${e.id}/prescriptions`} className="text-emerald-700 hover:underline">
                          Rx
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 rounded-b-lg sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(startIndex + ITEMS_PER_PAGE, filteredEncounters.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredEncounters.length}</span> results
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-700">
                      Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
                      <span className="font-semibold text-slate-900">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
