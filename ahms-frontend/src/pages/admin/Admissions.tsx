import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, Spinner, PageHeader, Button, Select, Input, Field } from '../../components/ui'
import { PlusCircle, HelpCircle } from 'lucide-react'

interface Admission {
  id: string
  admission_no: string
  patient_id: string
  uhid: string
  patient_name: string
  gender: string
  age: string
  department_id: string
  department_name: string
  doctor_id: string
  doctor_name: string
  bed_id?: string
  bed_no?: string
  ward_name?: string
  admission_type: string
  admission_date: string
  reason: string
  status: string
  created_at: string
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

interface Bed {
  id: string
  ward_id: string
  ward_name?: string
  bed_no: string
  bed_type: string
  status: string
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ADMITTED':
      return 'green'
    case 'DISCHARGED':
      return 'slate'
    case 'TRANSFERRED':
      return 'blue'
    case 'CANCELLED':
      return 'red'
    default:
      return 'amber'
  }
}

export default function Admissions() {
  const [admissions, setAdmissions] = useState<Admission[] | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patient_id: '',
    department_id: '',
    doctor_id: '',
    bed_id: '',
    admission_type: 'PLANNED',
    admission_date: new Date().toISOString().slice(0, 10),
    admission_time: '',
    reason: '',
    diagnosis: '',
    notes: '',
    expected_discharge_date: '',
  })

  const load = () => {
    api
      .get<{ data: Admission[] }>('/admissions')
      .then((res) => setAdmissions(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load admissions')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Patient[] }>('/patients').then((res) => setPatients(res.data.data)).catch(() => {})
    api.get<{ data: Doctor[] }>('/doctors').then((res) => setDoctors(res.data.data)).catch(() => {})
    api.get<{ data: Department[] }>('/departments').then((res) => setDepartments(res.data.data)).catch(() => {})
    api.get<{ data: Bed[] }>('/beds').then((res) => setBeds(res.data.data)).catch(() => {})
  }, [])

  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE')

  const admit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/admissions', {
        ...form,
        bed_id: form.bed_id || undefined,
        admission_time: form.admission_time || undefined,
        expected_discharge_date: form.expected_discharge_date || undefined,
      })
      setShowForm(false)
      setForm({ ...form, patient_id: '', department_id: '', doctor_id: '', bed_id: '', admission_time: '', reason: '', diagnosis: '', notes: '', expected_discharge_date: '' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to admit patient'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="IPD Admissions"
        subtitle="Manage inpatient stays, allocate ward beds, and track admission logs."
        action={
          <Can permission="admission.create">
            <Button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 shadow-sm">
              <PlusCircle className="h-4.5 w-4.5" />
              {showForm ? 'Cancel Admission' : 'Admit Patient'}
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
          <CardHeader title="New Inpatient Admission" />
          <form onSubmit={admit} className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Patient Name *">
              <Select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
                <option value="">Select a registered patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.uhid})</option>
                ))}
              </Select>
            </Field>
            <Field label="Department *">
              <Select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} required>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Doctor *">
              <Select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} required>
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Allocate Bed (available)">
              <Select value={form.bed_id} onChange={(e) => setForm({ ...form, bed_id: e.target.value })}>
                <option value="">Allocate later</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>{b.bed_no} — {b.ward_name || 'Ward'}</option>
                ))}
              </Select>
            </Field>
            <Field label="Admission Type">
              <Select value={form.admission_type} onChange={(e) => setForm({ ...form, admission_type: e.target.value })}>
                <option value="PLANNED">Planned</option>
                <option value="EMERGENCY">Emergency</option>
              </Select>
            </Field>
            <Field label="Admission Date">
              <Input type="date" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} />
            </Field>
            <Field label="Admission Time">
              <Input type="time" value={form.admission_time} onChange={(e) => setForm({ ...form, admission_time: e.target.value })} />
            </Field>
            <Field label="Expected Discharge Date">
              <Input type="date" value={form.expected_discharge_date} onChange={(e) => setForm({ ...form, expected_discharge_date: e.target.value })} />
            </Field>
            <Field label="Reason for Admission">
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Severe vata disorder, needs Panchakarma" />
            </Field>
            <Field label="Initial Diagnosis">
              <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="e.g. Amavata (Rheumatoid Arthritis)" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Admission Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-muted/30/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-muted-foreground"
                  placeholder="Clinical observations or instructions..."
                />
              </Field>
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2 border-t border-border mt-2">
              <Button type="submit" disabled={loading}>{loading ? 'Admitting...' : 'Admit Patient'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {!admissions ? (
          <Spinner label="Loading admissions..." />
        ) : admissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-semibold text-foreground">No IPD admissions found</p>
            <p className="text-xs text-muted-foreground mt-1">There are no active or historic inpatient admission records recorded.</p>
          </div>
        ) : (
          <Table headers={['Admission No', 'Patient', 'Department', 'Doctor', 'Bed', 'Type', 'Date', 'Status', '']}>
            {admissions.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{a.admission_no}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link to={`/admin/patients/${a.patient_id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                      {a.patient_name?.trim() ? a.patient_name : <span className="italic text-muted-foreground">Unnamed Patient</span>}
                    </Link>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{a.uhid}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{a.department_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{a.doctor_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{a.bed_no ? `${a.bed_no}${a.ward_name ? ` (${a.ward_name})` : ''}` : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs font-semibold">{a.admission_type}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.admission_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(a.status)}>{a.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/admin/admissions/${a.id}`} className="text-sm font-semibold text-primary hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
