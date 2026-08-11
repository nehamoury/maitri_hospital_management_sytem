import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Select, Input, Field } from '../../components/ui'

interface ProcedureType {
  id: string
  name: string
  category: string
}

interface Therapist {
  id: string
  full_name: string
}

interface Doctor {
  id: string
  full_name: string
}

interface Patient {
  id: string
  full_name: string
  uhid: string
}

interface Session {
  id: string
  session_number: number
  session_date: string
  therapist_name?: string
  status: string
  before_condition?: string
  after_condition?: string
  complications?: string
  observations?: string
  started_at?: string
  completed_at?: string
}

interface Plan {
  id: string
  plan_no: string
  patient_id: string
  patient_name: string
  patient_uh_id: string
  procedure_name: string
  procedure_category: string
  doctor_name: string
  indication: string
  planned_sessions: number
  frequency: string
  start_date: string
  end_date?: string
  therapist_name?: string
  status: string
  notes?: string
  approved_by?: string
  final_assessment?: string
  completed_by?: string
  created_at: string
  sessions: Session[]
}

interface PlanListItem {
  id: string
  plan_no: string
  patient_name: string
  patient_uh_id: string
  procedure_name: string
  doctor_name: string
  planned_sessions: number
  completed_sessions: number
  start_date: string
  therapist_name?: string
  status: string
  created_at: string
}

const planStatusColor = (s: string) =>
  s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : s === 'APPROVED' || s === 'IN_PROGRESS' ? 'blue' : 'amber'

const sessionStatusColor = (s: string) =>
  s === 'COMPLETED' ? 'green' : s === 'SKIPPED' ? 'red' : s === 'IN_PROGRESS' ? 'blue' : 'slate'

const emptyForm = {
  patient_id: '',
  procedure_type_id: '',
  planned_sessions: '7',
  frequency: 'DAILY',
  start_date: '',
  doctor_id: '',
  assigned_therapist_user_id: '',
  indication: '',
  notes: '',
}

export default function TreatmentPlans() {
  const [plans, setPlans] = useState<PlanListItem[] | null>(null)
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'list' | 'create'>('list')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [selected, setSelected] = useState<Plan | null>(null)
  const [assessment, setAssessment] = useState('')

  const load = () => {
    api
      .get<{ data: PlanListItem[] }>('/treatment-plans', { params: { status: statusFilter || undefined, search: search || undefined } })
      .then((res) => setPlans(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load treatment plans')))
  }

  useEffect(() => {
    load()
    api.get<{ data: ProcedureType[] }>('/procedure-types').then((res) => setProcedureTypes(res.data.data)).catch(() => { })
    api.get<{ data: Therapist[] }>('/therapists').then((res) => setTherapists(res.data.data)).catch(() => { })
    api.get<{ data: Doctor[] }>('/doctors').then((res) => setDoctors(res.data.data)).catch(() => { })
    api.get<{ data: Patient[] }>('/patients').then((res) => setPatients(res.data.data)).catch(() => { })
  }, [])

  const openPlan = (id: string) => {
    api
      .get<{ data: Plan }>(`/treatment-plans/${id}`)
      .then((res) => setSelected(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load plan')))
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = {
        patient_id: form.patient_id,
        procedure_type_id: form.procedure_type_id,
        doctor_id: form.doctor_id || undefined,
        planned_sessions: parseInt(form.planned_sessions, 10),
        frequency: form.frequency,
        start_date: form.start_date,
        assigned_therapist_user_id: form.assigned_therapist_user_id || undefined,
        indication: form.indication,
        notes: form.notes,
      }
      const res = await api.post<{ data: { id: string } }>('/treatment-plans', body)
      setForm({ ...emptyForm })
      setTab('list')
      load()
      openPlan(res.data.data.id)
    } catch (err) {
      setError(errorMessage(err, 'Failed to create plan'))
    } finally {
      setLoading(false)
    }
  }

  const approve = async (id: string) => {
    try {
      await api.post(`/treatment-plans/${id}/approve`)
      load()
      if (selected?.id === id) openPlan(id)
    } catch (err) {
      setError(errorMessage(err, 'Failed to approve plan'))
    }
  }

  const cancel = async (id: string) => {
    try {
      await api.post(`/treatment-plans/${id}/cancel`)
      load()
      if (selected?.id === id) openPlan(id)
    } catch (err) {
      setError(errorMessage(err, 'Failed to cancel plan'))
    }
  }

  const complete = async (id: string) => {
    if (!assessment.trim()) {
      setError('Final assessment is required to complete the plan')
      return
    }
    try {
      await api.post(`/treatment-plans/${id}/complete`, { final_assessment: assessment })
      setAssessment('')
      load()
      if (selected?.id === id) openPlan(id)
    } catch (err) {
      setError(errorMessage(err, 'Failed to complete plan'))
    }
  }

  const panchakarma = procedureTypes.filter((p) => p.category === 'PANCHAKARMA')

  return (
    <div>
      <PageHeader title="Treatment Plans" subtitle="Panchakarma & procedure courses" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === 'list' ? 'primary' : 'secondary'} onClick={() => setTab('list')}>
          Plans
        </Button>
        <Can permission="treatment.create">
          <Button variant={tab === 'create' ? 'primary' : 'secondary'} onClick={() => setTab('create')}>
            Create Plan
          </Button>
        </Can>
        {statusFilter && (
          <Button variant="ghost" onClick={() => { setStatusFilter(''); load() }}>
            Clear status filter
          </Button>
        )}
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {tab === 'list' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Status">
                <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); load() }}>
                  <option value="">All statuses</option>
                  <option value="PLANNED">Planned</option>
                  <option value="APPROVED">Approved</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Search">
                  <Input
                    placeholder="Patient name or UHID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') load() }}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            {!plans ? (
              <Spinner label="Loading plans..." />
            ) : plans.length === 0 ? (
              <EmptyState message="No treatment plans found" />
            ) : (
              <Table headers={['Plan No', 'Patient', 'Procedure', 'Doctor', 'Sessions', 'Start', 'Therapist', 'Status', '']}>
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-emerald-700">{p.plan_no}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{p.patient_name}</span>
                      <span className="ml-1 font-mono text-xs text-slate-400">{p.patient_uh_id}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.procedure_name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.doctor_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold">{p.completed_sessions}</span>
                      <span className="text-slate-400">/{p.planned_sessions}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.start_date}</td>
                    <td className="px-4 py-3 text-slate-600">{p.therapist_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={planStatusColor(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openPlan(p.id)} className="text-sm font-medium text-emerald-700 hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === 'create' && (
        <Card className="max-w-3xl">
          <CardHeader title="Create Treatment Plan" subtitle="Doctor orders a procedure course; sessions are auto-scheduled" />
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
            <Field label="Prescribing Doctor (Required if not a doctor)">
              <Select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Procedure *">
              <Select value={form.procedure_type_id} onChange={(e) => setForm({ ...form, procedure_type_id: e.target.value })} required>
                <option value="">Select procedure</option>
                {panchakarma.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Number of Sessions *">
              <Input
                type="number"
                min={1}
                max={60}
                value={form.planned_sessions}
                onChange={(e) => setForm({ ...form, planned_sessions: e.target.value })}
                required
              />
            </Field>
            <Field label="Frequency *">
              <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} required>
                <option value="DAILY">Daily</option>
                <option value="ALTERNATE_DAY">Alternate day</option>
                <option value="WEEKLY">Weekly</option>
              </Select>
            </Field>
            <Field label="Start Date *">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </Field>
            <Field label="Therapist">
              <Select value={form.assigned_therapist_user_id} onChange={(e) => setForm({ ...form, assigned_therapist_user_id: e.target.value })}>
                <option value="">Unassigned</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Indication">
                <Input value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {selected.plan_no} — {selected.procedure_name}
                  </h2>
                  <Badge color={planStatusColor(selected.status)}>{selected.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.patient_name} ({selected.patient_uh_id}) · {selected.doctor_name}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-xl px-3 py-1.5 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <div className="grid gap-4 border-b border-slate-100 p-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Frequency</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{selected.frequency}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Schedule</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {selected.start_date} → {selected.end_date || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Therapist</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{selected.therapist_name || 'Unassigned'}</p>
              </div>
              {selected.indication && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Indication</p>
                  <p className="mt-1 text-sm text-slate-700">{selected.indication}</p>
                </div>
              )}
              {selected.notes && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{selected.notes}</p>
                </div>
              )}
              {selected.approved_by && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved by</p>
                  <p className="mt-1 text-sm text-slate-700">{selected.approved_by}</p>
                </div>
              )}
              {selected.final_assessment && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Final Assessment</p>
                  <p className="mt-1 text-sm text-slate-700">{selected.final_assessment}</p>
                </div>
              )}
            </div>

            <div className="p-6">
              <p className="mb-3 text-sm font-bold text-slate-800">Sessions ({selected.sessions.length})</p>
              <div className="space-y-3">
                {selected.sessions.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-emerald-700">Session {s.session_number}</span>
                        <span className="text-sm text-slate-600">{s.session_date}</span>
                        <Badge color={sessionStatusColor(s.status)}>{s.status}</Badge>
                      </div>
                      {s.therapist_name && <span className="text-xs text-slate-400">{s.therapist_name}</span>}
                    </div>
                    {(s.before_condition || s.after_condition || s.observations || s.complications) && (
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        {s.before_condition && <p><span className="font-medium text-slate-500">Before:</span> {s.before_condition}</p>}
                        {s.after_condition && <p><span className="font-medium text-slate-500">After:</span> {s.after_condition}</p>}
                        {s.observations && <p><span className="font-medium text-slate-500">Observations:</span> {s.observations}</p>}
                        {s.complications && <p><span className="font-medium text-slate-500">Complications:</span> {s.complications}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-6">
              {(selected.status === 'PLANNED' || selected.status === 'APPROVED' || selected.status === 'IN_PROGRESS') && (
                <Can permission="treatment.complete">
                  <div className="flex-1">
                    <Field label="Final Assessment">
                      <Input value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Treatment outcome summary..." />
                    </Field>
                  </div>
                </Can>
              )}
              {selected.status === 'PLANNED' && (
                <Can permission="treatment.approve">
                  <Button onClick={() => approve(selected.id)}>Approve Plan</Button>
                </Can>
              )}
              {(selected.status === 'PLANNED' || selected.status === 'APPROVED' || selected.status === 'IN_PROGRESS') && (
                <Can permission="treatment.update">
                  <Button variant="danger" onClick={() => cancel(selected.id)}>Cancel Plan</Button>
                </Can>
              )}
              {selected.status !== 'COMPLETED' && selected.status !== 'CANCELLED' && (
                <Can permission="treatment.complete">
                  <Button onClick={() => complete(selected.id)} disabled={!assessment.trim()}>
                    Complete Plan
                  </Button>
                </Can>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
