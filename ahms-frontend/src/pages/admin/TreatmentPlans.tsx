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
  therapist_user_id?: string
  therapist_name?: string
  therapist_overridden?: boolean
  status: string
  duration_minutes?: number
  materials_used?: string
  before_condition?: string
  after_condition?: string
  complications?: string
  observations?: string
  notes?: string
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

  // New states for expanded UI
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sessionMode, setSessionMode] = useState<'start' | 'complete' | 'skip' | null>(null)
  const [sessionForm, setSessionForm] = useState({ duration_minutes: '', materials_used: '', before_condition: '', after_condition: '', complications: '', observations: '', notes: '', reason: '' })
  
  const [reassignMode, setReassignMode] = useState<'plan' | 'session' | null>(null)
  const [reassignSessionId, setReassignSessionId] = useState<string | null>(null)
  const [reassignTherapistId, setReassignTherapistId] = useState<string>('')

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
      .then((res) => {
        setSelected(res.data.data)
        setAssessment(res.data.data.final_assessment || '')
      })
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
    if (!confirm('Are you sure you want to cancel this plan?')) return
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
      alert('Final assessment is required to complete the plan')
      return
    }
    if (!confirm('Mark this plan as complete?')) return
    try {
      await api.post(`/treatment-plans/${id}/complete`, { final_assessment: assessment })
      load()
      if (selected?.id === id) openPlan(id)
    } catch (err) {
      setError(errorMessage(err, 'Failed to complete plan'))
    }
  }

  // Session actions
  const startSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession) return
    try {
      await api.post(`/treatment-sessions/${activeSession.id}/start`, { before_condition: sessionForm.before_condition })
      closeSessionModal()
      if (selected) openPlan(selected.id)
      load()
    } catch (err) {
      alert(errorMessage(err, 'Failed to start session'))
    }
  }

  const completeSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession) return
    try {
      await api.post(`/treatment-sessions/${activeSession.id}/complete`, {
        duration_minutes: parseInt(sessionForm.duration_minutes || '0', 10),
        materials_used: sessionForm.materials_used,
        after_condition: sessionForm.after_condition,
        complications: sessionForm.complications,
        observations: sessionForm.observations,
        notes: sessionForm.notes
      })
      closeSessionModal()
      if (selected) openPlan(selected.id)
      load()
    } catch (err) {
      alert(errorMessage(err, 'Failed to complete session'))
    }
  }

  const skipSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession) return
    try {
      await api.post(`/treatment-sessions/${activeSession.id}/skip`, { reason: sessionForm.reason })
      closeSessionModal()
      if (selected) openPlan(selected.id)
      load()
    } catch (err) {
      alert(errorMessage(err, 'Failed to skip session'))
    }
  }

  const handleReassignPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    try {
      await api.post(`/treatment-plans/${selected.id}/reassign-therapist`, { therapist_user_id: reassignTherapistId })
      setReassignMode(null)
      openPlan(selected.id)
      load()
    } catch (err) {
      alert(errorMessage(err, 'Failed to reassign plan therapist'))
    }
  }

  const handleReassignSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reassignSessionId || !selected) return
    try {
      await api.patch(`/treatment-sessions/${reassignSessionId}/therapist`, { therapist_user_id: reassignTherapistId })
      setReassignMode(null)
      setReassignSessionId(null)
      openPlan(selected.id)
    } catch (err) {
      alert(errorMessage(err, 'Failed to reassign session therapist'))
    }
  }

  const openSessionModal = (session: Session, mode: 'start' | 'complete' | 'skip') => {
    setActiveSession(session)
    setSessionMode(mode)
    setSessionForm({ duration_minutes: session.duration_minutes?.toString() || '', materials_used: session.materials_used || '', before_condition: session.before_condition || '', after_condition: session.after_condition || '', complications: session.complications || '', observations: session.observations || '', notes: session.notes || '', reason: '' })
  }

  const closeSessionModal = () => {
    setActiveSession(null)
    setSessionMode(null)
  }

  const panchakarma = procedureTypes.filter((p) => p.category === 'PANCHAKARMA')

  // Calculate progress
  const totalSessions = selected?.sessions.length || 0
  const completedSessions = selected?.sessions.filter(s => s.status === 'COMPLETED' || s.status === 'SKIPPED').length || 0
  const progressPercent = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

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

      {/* Plan Details Modal */}
      {selected && !reassignMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex-none border-b border-slate-100 px-6 py-5 bg-white sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {selected.plan_no} — {selected.procedure_name}
                    </h2>
                    <Badge color={planStatusColor(selected.status)}>{selected.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{selected.patient_name}</span> ({selected.patient_uh_id}) · Prescribed by <span className="font-medium">{selected.doctor_name}</span>
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
                  ✕
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                <span>Treatment Progress</span>
                <span>{completedSessions} of {totalSessions} Sessions</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              {/* Plan Info Grid */}
              <div className="grid gap-4 border-b border-slate-200 bg-white p-6 sm:grid-cols-4">
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
                <div className="sm:col-span-2 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Therapist</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{selected.therapist_name || 'Unassigned'}</p>
                  </div>
                  <Can permission="treatment.update">
                    {(selected.status === 'PLANNED' || selected.status === 'APPROVED' || selected.status === 'IN_PROGRESS') && (
                      <button 
                        onClick={() => setReassignMode('plan')}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      >
                        Change
                      </button>
                    )}
                  </Can>
                </div>
                {selected.indication && (
                  <div className="sm:col-span-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Indication / Notes</p>
                    <p className="mt-1 text-sm text-slate-700">{selected.indication} {selected.notes ? `— ${selected.notes}` : ''}</p>
                  </div>
                )}
              </div>

              {/* Sessions List */}
              <div className="p-6">
                <h3 className="mb-4 text-base font-bold text-slate-800">Execution Schedule</h3>
                <div className="space-y-3">
                  {selected.sessions.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
                      {/* Session Header */}
                      <div 
                        className="flex cursor-pointer flex-wrap items-center justify-between gap-4 p-4 hover:bg-slate-50"
                        onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : s.status === 'SKIPPED' ? 'bg-red-100 text-red-700' : s.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {s.session_number}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{s.session_date}</p>
                            <p className="text-xs text-slate-500">
                              {s.therapist_name || selected.therapist_name || 'Unassigned Therapist'}
                              {s.therapist_overridden && <span className="ml-1 text-amber-600 font-medium">(Override)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge color={sessionStatusColor(s.status)}>{s.status}</Badge>
                          <span className="text-slate-400 text-xs">{expandedSession === s.id ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Expanded Session Detail */}
                      {expandedSession === s.id && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4 animate-in fade-in slide-in-from-top-2">
                          
                          {/* Clinical Data */}
                          {(s.before_condition || s.after_condition || s.observations || s.complications || s.materials_used) ? (
                            <div className="mb-4 grid gap-4 rounded-lg bg-white p-4 text-sm text-slate-700 border border-slate-100 shadow-sm sm:grid-cols-2">
                              {s.before_condition && <div><p className="font-semibold text-slate-500 text-xs uppercase mb-1">Before Session</p><p>{s.before_condition}</p></div>}
                              {s.after_condition && <div><p className="font-semibold text-slate-500 text-xs uppercase mb-1">After Session</p><p>{s.after_condition}</p></div>}
                              {s.materials_used && <div><p className="font-semibold text-slate-500 text-xs uppercase mb-1">Materials Used</p><p>{s.materials_used}</p></div>}
                              {s.duration_minutes && <div><p className="font-semibold text-slate-500 text-xs uppercase mb-1">Duration</p><p>{s.duration_minutes} mins</p></div>}
                              {s.observations && <div className="sm:col-span-2"><p className="font-semibold text-slate-500 text-xs uppercase mb-1">Observations</p><p>{s.observations}</p></div>}
                              {s.complications && <div className="sm:col-span-2"><p className="font-semibold text-red-400 text-xs uppercase mb-1">Complications</p><p className="text-red-700">{s.complications}</p></div>}
                            </div>
                          ) : (
                            <div className="mb-4 text-sm text-slate-500 italic">No clinical notes recorded yet.</div>
                          )}

                          {/* Action Buttons */}
                          <Can permission="treatment.session">
                            <div className="flex flex-wrap items-center gap-2">
                              {s.status === 'PENDING' && (
                                <>
                                  <Button onClick={() => openSessionModal(s, 'start')}>Start Session</Button>
                                  <Button variant="danger" onClick={() => openSessionModal(s, 'skip')}>Skip Session</Button>
                                  <Can permission="treatment.update">
                                    <Button variant="secondary" onClick={() => { setReassignMode('session'); setReassignSessionId(s.id) }}>Reassign Therapist</Button>
                                  </Can>
                                </>
                              )}
                              {s.status === 'IN_PROGRESS' && (
                                <Button onClick={() => openSessionModal(s, 'complete')} className="bg-emerald-600 hover:bg-emerald-700">Complete Session</Button>
                              )}
                            </div>
                          </Can>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Plan Footer Actions */}
            <div className="flex-none bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sticky bottom-0 z-10 border-t border-slate-200">
              <div className="flex flex-wrap items-end gap-3">
                {(selected.status === 'PLANNED' || selected.status === 'APPROVED' || selected.status === 'IN_PROGRESS') && (
                  <Can permission="treatment.complete">
                    <div className="flex-1">
                      <Field label="Final Clinical Assessment">
                        <Input value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Final treatment outcome summary..." />
                      </Field>
                    </div>
                  </Can>
                )}
                <div className="flex items-center gap-2">
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

          </div>
        </div>
      )}

      {/* Session Action Modal (Start / Complete / Skip) */}
      {activeSession && sessionMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={closeSessionModal}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800">
                {sessionMode === 'start' && `Start Session ${activeSession.session_number}`}
                {sessionMode === 'complete' && `Complete Session ${activeSession.session_number}`}
                {sessionMode === 'skip' && `Skip Session ${activeSession.session_number}`}
              </h3>
            </div>
            <form onSubmit={sessionMode === 'start' ? startSession : sessionMode === 'complete' ? completeSession : skipSession} className="p-6 grid gap-4">
              
              {sessionMode === 'start' && (
                <Field label="Before Condition (Optional)">
                  <Input value={sessionForm.before_condition} onChange={(e) => setSessionForm({...sessionForm, before_condition: e.target.value})} placeholder="Patient's condition before starting..." />
                </Field>
              )}

              {sessionMode === 'complete' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Duration (minutes)">
                      <Input type="number" min={1} value={sessionForm.duration_minutes} onChange={(e) => setSessionForm({...sessionForm, duration_minutes: e.target.value})} required />
                    </Field>
                    <Field label="Materials Used">
                      <Input value={sessionForm.materials_used} onChange={(e) => setSessionForm({...sessionForm, materials_used: e.target.value})} />
                    </Field>
                  </div>
                  <Field label="After Condition">
                    <Input value={sessionForm.after_condition} onChange={(e) => setSessionForm({...sessionForm, after_condition: e.target.value})} placeholder="Patient's condition after session..." />
                  </Field>
                  <Field label="Observations">
                    <Input value={sessionForm.observations} onChange={(e) => setSessionForm({...sessionForm, observations: e.target.value})} />
                  </Field>
                  <Field label="Complications">
                    <Input value={sessionForm.complications} onChange={(e) => setSessionForm({...sessionForm, complications: e.target.value})} placeholder="Any adverse reactions..." />
                  </Field>
                </>
              )}

              {sessionMode === 'skip' && (
                <Field label="Reason for Skipping *">
                  <Input value={sessionForm.reason} onChange={(e) => setSessionForm({...sessionForm, reason: e.target.value})} required placeholder="E.g., Patient felt unwell, missed appointment..." />
                </Field>
              )}

              <div className="mt-2 flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={closeSessionModal}>Cancel</Button>
                <Button type="submit" variant={sessionMode === 'skip' ? 'danger' : 'primary'}>
                  {sessionMode === 'start' && 'Start Session'}
                  {sessionMode === 'complete' && 'Complete Session'}
                  {sessionMode === 'skip' && 'Skip Session'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Therapist Reassignment Modal */}
      {reassignMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setReassignMode(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800">
                {reassignMode === 'plan' ? 'Reassign Plan Therapist' : 'Reassign Session Therapist'}
              </h3>
            </div>
            <form onSubmit={reassignMode === 'plan' ? handleReassignPlan : handleReassignSession} className="p-6">
              <div className="mb-4 text-sm text-slate-600">
                {reassignMode === 'plan' 
                  ? "Select a new default therapist. This will update all pending sessions that haven't been individually reassigned."
                  : "Override the therapist for this specific session only."}
              </div>
              <Field label="Select New Therapist *">
                <Select value={reassignTherapistId} onChange={(e) => setReassignTherapistId(e.target.value)} required>
                  <option value="">Select a therapist</option>
                  {therapists.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </Select>
              </Field>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={() => setReassignMode(null)}>Cancel</Button>
                <Button type="submit">Reassign</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
