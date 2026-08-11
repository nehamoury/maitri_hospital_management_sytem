import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Select, Input, Field } from '../../components/ui'

interface ReferralItem {
  id: string
  referral_no: string
  patient_id: string
  uhid: string
  patient_name: string
  from_department: string
  to_department: string
  reason: string
  priority: string
  diagnosis: string
  status: string
  referred_at: string
}

interface Patient {
  id: string
  full_name: string
  uhid: string
}

interface Encounter {
  id: string
  patient_id: string
  patient_name: string
  department_name: string
  doctor_name: string
  visit_date: string
}

interface Department {
  id: string
  name: string
}

const priorityColor = (p: string) =>
  p === 'EMERGENCY' ? 'red' : p === 'URGENT' ? 'amber' : 'blue'

const statusColor = (s: string) =>
  s === 'COMPLETED' ? 'green' : s === 'REJECTED' || s === 'CANCELLED' ? 'red' : s === 'ACCEPTED' || s === 'CONSULTATION_STARTED' ? 'blue' : 'amber'

export default function Referrals() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [incoming, setIncoming] = useState<ReferralItem[] | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  
  const initialTab = searchParams.get('tab') === 'create' ? 'create' : 'incoming'
  const [tab, setTab] = useState<'incoming' | 'create'>(initialTab)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patient_id: searchParams.get('patient_id') || '',
    source_encounter_id: searchParams.get('encounter_id') || '',
    to_department_id: '',
    reason: '',
    clinical_notes: '',
    priority: 'ROUTINE',
    recommended_treatment: '',
    diagnosis: '',
  })

  const loadIncoming = () => {
    api
      .get<{ data: ReferralItem[] }>('/referrals/incoming')
      .then((res) => setIncoming(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load incoming referrals')))
  }

  useEffect(() => {
    loadIncoming()
    api.get<{ data: Patient[] }>('/patients').then((res) => setPatients(res.data.data)).catch(() => {})
    api.get<{ data: Encounter[] }>('/encounters').then((res) => setEncounters(res.data.data)).catch(() => {})
    api.get<{ data: Department[] }>('/departments').then((res) => setDepartments(res.data.data)).catch(() => {})
  }, [])

  const patientEncounters = encounters.filter((e) => e.patient_id === form.patient_id)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post<{ data: { id: string } }>('/referrals', form)
      setForm({ ...form, patient_id: '', source_encounter_id: '', to_department_id: '', reason: '', clinical_notes: '', recommended_treatment: '', diagnosis: '' })
      setTab('incoming')
      loadIncoming()
      navigate(`/admin/referrals/${res.data.data.id}`)
    } catch (err) {
      setError(errorMessage(err, 'Failed to create referral'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Referrals" subtitle="Inter-department referrals" />
      <div className="mb-4 flex gap-2">
        <Button variant={tab === 'incoming' ? 'primary' : 'secondary'} onClick={() => setTab('incoming')}>
          Incoming
        </Button>
        <Can permission="referral.create">
          <Button variant={tab === 'create' ? 'primary' : 'secondary'} onClick={() => setTab('create')}>
            Create Referral
          </Button>
        </Can>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {tab === 'incoming' && (
        <Card>
          {!incoming ? (
            <Spinner label="Loading referrals..." />
          ) : incoming.length === 0 ? (
            <EmptyState message="No incoming referrals for your department" />
          ) : (
            <Table headers={['Ref No', 'Patient', 'From', 'To', 'Reason', 'Priority', 'Status', '']}>
              {incoming.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-emerald-700">{r.referral_no}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{r.patient_name}</span>
                    <span className="ml-1 font-mono text-xs text-slate-400">{r.uhid}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.from_department}</td>
                  <td className="px-4 py-3 text-slate-600">{r.to_department}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">{r.reason}</td>
                  <td className="px-4 py-3">
                    <Badge color={priorityColor(r.priority)}>{r.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/referrals/${r.id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'create' && (
        <Card className="max-w-2xl">
          <CardHeader title="Create Referral" />
          <form onSubmit={create} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Patient *">
              <Select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value, source_encounter_id: '' })} required>
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.uhid})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="To Department *">
              <Select value={form.to_department_id} onChange={(e) => setForm({ ...form, to_department_id: e.target.value })} required>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Source Encounter *">
              <Select value={form.source_encounter_id} onChange={(e) => setForm({ ...form, source_encounter_id: e.target.value })} required>
                <option value="">Select encounter</option>
                {patientEncounters.map((en) => (
                  <option key={en.id} value={en.id}>
                    {new Date(en.visit_date).toLocaleDateString()} — {en.department_name} ({en.doctor_name})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason *">
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Clinical Notes">
                <Input value={form.clinical_notes} onChange={(e) => setForm({ ...form, clinical_notes: e.target.value })} />
              </Field>
            </div>
            <Field label="Diagnosis">
              <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            </Field>
            <Field label="Recommended Treatment">
              <Input value={form.recommended_treatment} onChange={(e) => setForm({ ...form, recommended_treatment: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Referral'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
