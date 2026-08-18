import { useCallback, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, errorMessage, dietApi } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, EmptyState, Spinner, PageHeader, Button, Input, Select, Field, Textarea } from '../../components/ui'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { PrescribeDietModal } from './diet/components/PrescribeDietModal'

interface Bed {
  id: string
  ward_id: string
  ward_name?: string
  bed_no: string
  bed_type: string
  status: string
}

interface Note {
  id: string
  note_type: string
  notes: string
  shift: string
  vitals: Record<string, string | number>
  recorded_by: string
  created_at: string
}

interface Order {
  id: string
  order_type: string
  description: string
  frequency: string
  quantity: string
  notes: string
  status: string
  ordered_by: string
  created_at: string
}

interface DietOrder {
  id: string
  diet_type: string
  schedule: string
  instructions: string
  status: string
  ordered_by: string
  created_at: string
}

interface BedHistory {
  id: string
  bed_no: string
  ward_name: string
  from_date: string
  to_date?: string
  reason: string
  changed_by: string
}

interface Discharge {
  discharge_type: string
  final_diagnosis: string
  treatment_given: string
  procedures_done: string
  medicines_at_discharge: string
  follow_up_instructions: string
  follow_up_date?: string
  summary: string
  discharge_notes: string
}

interface Admission {
  id: string
  admission_no: string
  patient_id: string
  uhid: string
  patient_name: string
  gender: string
  age: string
  department_name: string
  doctor_name: string
  bed_id?: string
  bed_no?: string
  bed_type?: string
  ward_name?: string
  admission_type: string
  admission_date: string
  admission_time: string
  reason: string
  diagnosis: string
  notes: string
  expected_discharge_date?: string
  status: string
  admitted_by: string
  discharged_at?: string
  discharged_by?: string
  progress_notes: Note[]
  orders: Order[]
  diet_orders: DietOrder[]
  bed_history: BedHistory[]
  discharge?: Discharge
  created_at: string
}

const NOTE_TYPES = ['ADMISSION_ASSESSMENT', 'DOCTOR_ROUND', 'NURSE_NOTE', 'VITAL', 'PROGRESS']
const ORDER_TYPES = ['MEDICINE', 'TREATMENT', 'INVESTIGATION', 'OTHER']
const ORDER_STATUSES = ['ORDERED', 'IN_PROGRESS', 'COMPLETED', 'HELD', 'CANCELLED']
const SHIFTS = ['MORNING', 'EVENING', 'NIGHT']
const DISCHARGE_TYPES = ['CURED', 'IMPROVED', 'REFERRED', 'LAMA', 'ABSCOND', 'EXPIRED']

const statusColor = (s: string) =>
  s === 'ADMITTED' ? 'green' : s === 'DISCHARGED' ? 'slate' : s === 'TRANSFERRED' ? 'blue' : s === 'CANCELLED' ? 'red' : 'amber'

const noteColor = (t: string) =>
  t === 'DOCTOR_ROUND' ? 'blue' : t === 'ADMISSION_ASSESSMENT' ? 'purple' : t === 'VITAL' ? 'amber' : 'slate'

const orderStatusColor = (s: string) =>
  s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : s === 'HELD' ? 'amber' : 'blue'

export default function AdmissionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [adm, setAdm] = useState<Admission | null>(null)
  const [beds, setBeds] = useState<Bed[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showDietForm, setShowDietForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [showDischargeForm, setShowDischargeForm] = useState(false)
  const [noteForm, setNoteForm] = useState({ note_type: 'PROGRESS', notes: '', shift: 'MORNING', vitals: '' })
  const [orderForm, setOrderForm] = useState({ order_type: 'MEDICINE', description: '', frequency: '', quantity: '', notes: '' })
  const [dietForm, setDietForm] = useState({ diet_type: '', schedule: '', instructions: '', status: 'ORDERED' })
  const [transferForm, setTransferForm] = useState({ bed_id: '', reason: '' })
  const [dischargeForm, setDischargeForm] = useState({
    discharge_type: 'CURED', discharge_date: new Date().toISOString().slice(0, 10), discharge_time: '',
    final_diagnosis: '', treatment_given: '', procedures_done: '', medicines_at_discharge: '',
    follow_up_instructions: '', follow_up_date: '', summary: '', discharge_notes: '',
  })
  const [dietPlans, setDietPlans] = useState<any[]>([])
  const [showPrescribe, setShowPrescribe] = useState(false)
  const [editPlan, setEditPlan] = useState<any>(null)
  const [renewPlan, setRenewPlan] = useState<any>(null)
  const [renewEndDate, setRenewEndDate] = useState('')
  const [cancelPlan, setCancelPlan] = useState<any>(null)
  const [cancelPlanReason, setCancelPlanReason] = useState('')
  const [renewing, setRenewing] = useState(false)
  const [cancellingPlan, setCancellingPlan] = useState(false)

  const load = useCallback(() => {
    if (!id) return
    api
      .get<{ data: Admission }>(`/admissions/${id}`)
      .then((res) => {
        setAdm(res.data.data)
        // Load Diet plans
        dietApi.listDietPlans(id).then(r => {
          if (r.data.success) setDietPlans(r.data.data)
        }).catch(() => {})
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load admission')))
  }, [id])

  useEffect(() => {
    load()
    api.get<{ data: Bed[] }>('/beds').then((res) => setBeds(res.data.data)).catch(() => {})
  }, [load])

  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE' && b.id !== adm?.bed_id)

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let vitals: Record<string, string | number> = {}
      try { vitals = noteForm.vitals.trim() ? JSON.parse(noteForm.vitals) : {} } catch { throw new Error('Vitals must be valid JSON, e.g. {"bp":"120/80","pulse":78}') }
      await api.post(`/admissions/${id}/notes`, { note_type: noteForm.note_type, notes: noteForm.notes, shift: noteForm.shift, vitals })
      setShowNoteForm(false)
      setNoteForm({ note_type: 'PROGRESS', notes: '', shift: 'MORNING', vitals: '' })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage(err, 'Failed to add note'))
    } finally {
      setLoading(false)
    }
  }

  const addOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/admissions/${id}/orders`, orderForm)
      setShowOrderForm(false)
      setOrderForm({ order_type: 'MEDICINE', description: '', frequency: '', quantity: '', notes: '' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to add order'))
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (oid: string, status: string) => {
    setError('')
    try {
      await api.put(`/admissions/${id}/orders/${oid}/status`, { status })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update order'))
    }
  }

  const addDiet = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/admissions/${id}/diet`, dietForm)
      setShowDietForm(false)
      setDietForm({ diet_type: '', schedule: '', instructions: '', status: 'ORDERED' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to add diet order'))
    } finally {
      setLoading(false)
    }
  }

  const openRenew = (plan: any) => {
    setRenewPlan(plan)
    setRenewEndDate(plan.end_date?.slice(0, 10) ?? new Date().toISOString().split('T')[0])
  }

  const handleRenew = async () => {
    if (!renewPlan) return
    if (!renewEndDate) {
      setError('End date is required')
      return
    }
    setRenewing(true)
    setError('')
    try {
      await dietApi.renewDietPlan(renewPlan.id, renewEndDate)
      setRenewPlan(null)
      toast.success('Diet plan renewed')
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to renew diet plan'))
    } finally {
      setRenewing(false)
    }
  }

  const openCancelPlan = (plan: any) => {
    setCancelPlan(plan)
    setCancelPlanReason('')
  }

  const handleCancelPlan = async () => {
    if (!cancelPlan) return
    setCancellingPlan(true)
    setError('')
    try {
      await dietApi.cancelDietPlan(cancelPlan.id, cancelPlanReason.trim() || undefined)
      setCancelPlan(null)
      toast.success('Diet plan cancelled')
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to cancel diet plan'))
    } finally {
      setCancellingPlan(false)
    }
  }

  const transferBed = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/admissions/${id}/transfer`, transferForm)
      setShowTransferForm(false)
      setTransferForm({ bed_id: '', reason: '' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to transfer bed'))
    } finally {
      setLoading(false)
    }
  }

  const discharge = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/admissions/${id}/discharge`, { ...dischargeForm, discharge_time: dischargeForm.discharge_time || undefined, follow_up_date: dischargeForm.follow_up_date || undefined })
      setShowDischargeForm(false)
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to discharge patient'))
    } finally {
      setLoading(false)
    }
  }

  const cancelAdmission = async () => {
    if (!window.confirm('Cancel this admission? The bed will be released.')) return
    setError('')
    try {
      await api.put(`/admissions/${id}`, { status: 'CANCELLED' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to cancel admission'))
    }
  }

  if (!adm) {
    return <Spinner label="Loading admission..." />
  }

  const isActive = adm.status === 'ADMITTED' || adm.status === 'TRANSFERRED'

  return (
    <div>
      <PageHeader
        title={`${adm.admission_no} — ${adm.patient_name}`}
        subtitle={`${adm.uhid} • ${adm.gender} • ${adm.age || '—'} yrs • ${adm.department_name} • ${adm.doctor_name}${adm.bed_no && adm.ward_name ? ` • Bed ${adm.bed_no} (${adm.ward_name})` : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/admin/patients/${adm.patient_id}`}>
              <Button variant="secondary">Patient</Button>
            </Link>
            {isActive && (
              <>
                <Can permission="admission.update">
                  <Button variant="secondary" onClick={() => setShowTransferForm((v) => !v)}>{showTransferForm ? 'Close' : 'Transfer Bed'}</Button>
                </Can>
                <Can permission="note.create">
                  <Button variant="secondary" onClick={() => setShowDietForm((v) => !v)}>{showDietForm ? 'Close' : '+ Diet'}</Button>
                </Can>
                <Can permission="admission.discharge">
                  <Button variant="danger" onClick={() => setShowDischargeForm((v) => !v)}>{showDischargeForm ? 'Close' : 'Discharge'}</Button>
                </Can>
              </>
            )}
            {isActive && (
              <Can permission="admission.update">
                <Button variant="secondary" onClick={cancelAdmission}>Cancel</Button>
              </Can>
            )}
            <Badge color={statusColor(adm.status)}>{adm.status}</Badge>
          </div>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admission Date</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {new Date(adm.admission_date).toLocaleDateString()}
            {adm.admission_time ? ` • ${adm.admission_time}` : ''}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{adm.admission_type}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expected Discharge</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{adm.expected_discharge_date ? new Date(adm.expected_discharge_date).toLocaleDateString() : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admitted By</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{adm.admitted_by || '—'}</p>
        </Card>
      </div>

      {(adm.reason || adm.diagnosis || adm.notes) && (
        <Card className="mb-6">
          <CardHeader title="Admission Details" />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {adm.reason && (
              <div><p className="text-xs font-bold uppercase text-slate-400">Reason</p><p className="mt-1 text-sm text-slate-700">{adm.reason}</p></div>
            )}
            {adm.diagnosis && (
              <div><p className="text-xs font-bold uppercase text-slate-400">Diagnosis</p><p className="mt-1 text-sm text-slate-700">{adm.diagnosis}</p></div>
            )}
            {adm.notes && (
              <div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Notes</p><p className="mt-1 text-sm text-slate-700">{adm.notes}</p></div>
            )}
          </div>
        </Card>
      )}

      {isActive && (
        <Card className="mb-6">
          <CardHeader
            title="Clinical Chart"
            subtitle="Progress notes, doctor rounds and vitals"
            action={
              <Can permission="note.create">
                <Button variant="secondary" onClick={() => setShowNoteForm((v) => !v)}>{showNoteForm ? 'Close' : '+ Add Note'}</Button>
              </Can>
            }
          />
          {showNoteForm && (
            <form onSubmit={addNote} className="grid gap-4 border-b border-border p-5 sm:grid-cols-2">
              <Field label="Note Type *">
                <Select value={noteForm.note_type} onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}>
                  {NOTE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </Select>
              </Field>
              <Field label="Shift">
                <Select value={noteForm.shift} onChange={(e) => setNoteForm({ ...noteForm, shift: e.target.value })}>
                  {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <Textarea value={noteForm.notes} onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })} rows={3} placeholder="Clinical findings, treatment response, observations..." />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Vitals (JSON)" hint='e.g. {"bp":"120/80","pulse":78,"temp":98.6,"spo2":98}'>
                  <Input value={noteForm.vitals} onChange={(e) => setNoteForm({ ...noteForm, vitals: e.target.value })} placeholder='{"bp":"120/80","pulse":78}' />
                </Field>
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Note'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowNoteForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
          <div className="p-5">
            {adm.progress_notes.length === 0 ? (
              <EmptyState message="No clinical notes recorded yet" />
            ) : (
              <div className="space-y-3">
                {adm.progress_notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge color={noteColor(n.note_type)}>{n.note_type.replace(/_/g, ' ')}</Badge>
                        {n.shift && <span className="text-xs font-medium text-slate-400">{n.shift}</span>}
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    {n.notes && <p className="mt-2 text-sm text-slate-700">{n.notes}</p>}
                    {n.vitals && Object.keys(n.vitals).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(n.vitals).map(([k, v]) => (
                          <span key={k} className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                    {n.recorded_by && <p className="mt-2 text-[11px] text-slate-400">By {n.recorded_by}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Clinical Orders"
            subtitle="Medicines, treatments, investigations"
            action={
              isActive && (
                <Can permission="note.create">
                  <Button variant="secondary" onClick={() => setShowOrderForm((v) => !v)}>{showOrderForm ? 'Close' : '+ Order'}</Button>
                </Can>
              )
            }
          />
          {showOrderForm && (
            <form onSubmit={addOrder} className="grid gap-4 border-b border-border p-5 sm:grid-cols-2">
              <Field label="Order Type *">
                <Select value={orderForm.order_type} onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}>
                  {ORDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Frequency">
                <Input value={orderForm.frequency} onChange={(e) => setOrderForm({ ...orderForm, frequency: e.target.value })} placeholder="e.g. BD, TDS, OD" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description *">
                  <Input value={orderForm.description} onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })} required placeholder="e.g. Virechana preparation, Shirodhara 45 min..." />
                </Field>
              </div>
              <Field label="Quantity">
                <Input value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} placeholder="e.g. 500 ml, 10 tabs" />
              </Field>
              <Field label="Notes">
                <Input value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
              </Field>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Order'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowOrderForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
          <div className="p-5">
            {adm.orders.length === 0 ? (
              <EmptyState message="No orders yet" />
            ) : (
              <div className="space-y-3">
                {adm.orders.map((o) => (
                  <div key={o.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase text-slate-400">{o.order_type}</span>
                          <Badge color={orderStatusColor(o.status)}>{o.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{o.description}</p>
                        <p className="text-xs text-slate-500">
                          {o.frequency && `Freq: ${o.frequency}`}
                          {o.quantity && ` • Qty: ${o.quantity}`}
                          {o.ordered_by && ` • By ${o.ordered_by}`}
                          {' • '}{new Date(o.created_at).toLocaleString()}
                        </p>
                        {o.notes && <p className="mt-1 text-xs text-slate-500">{o.notes}</p>}
                      </div>
                      {isActive && (
                        <Can permission="note.create">
                          <Select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="w-40">
                            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </Select>
                        </Can>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Diet Orders & Plans"
              subtitle="Ayurvedic diet & pathya plans"
              action={
                isActive && (
                  <div className="flex gap-2">
                    <Can permission="diet.order">
                      <Button variant="primary" onClick={() => setShowPrescribe(true)}>+ Diet Plan</Button>
                    </Can>
                    <Can permission="diet.create">
                      <Button variant="secondary" onClick={() => setShowDietForm((v) => !v)}>{showDietForm ? 'Close' : '+ Diet Instruction'}</Button>
                    </Can>
                  </div>
                )
              }
            />
            {showDietForm && (
              <form onSubmit={addDiet} className="grid gap-4 border-b border-border p-5 sm:grid-cols-2">
                <Field label="Diet Type *">
                  <Input value={dietForm.diet_type} onChange={(e) => setDietForm({ ...dietForm, diet_type: e.target.value })} required placeholder="e.g. Pathya, Khichdi, Vata-pacifying" />
                </Field>
                <Field label="Schedule">
                  <Input value={dietForm.schedule} onChange={(e) => setDietForm({ ...dietForm, schedule: e.target.value })} placeholder="e.g. Breakfast, Lunch, Dinner" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Instructions">
                    <Input value={dietForm.instructions} onChange={(e) => setDietForm({ ...dietForm, instructions: e.target.value })} placeholder="e.g. Warm, with ghee, no salt" />
                  </Field>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Diet Order'}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowDietForm(false)}>Cancel</Button>
                </div>
              </form>
            )}
            <div className="p-5 space-y-4">
              {/* Diet Plans History — active plan + renewal/cancel + history (SOW 16) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2">Active Diet Plan (SOW 16)</h4>
                {dietPlans.filter(p => p.is_active).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No active diet plan prescribed.</p>
                ) : (
                  dietPlans.filter(p => p.is_active).map(plan => (
                    <div key={plan.id} className="rounded-xl border border-teal-100 bg-teal-50/20 p-4 mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-teal-900">{plan.diet_type}</p>
                          <p className="text-xs text-teal-800/80 mt-0.5">
                            Validity: {new Date(plan.start_date).toLocaleDateString()} to {new Date(plan.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end gap-1">
                            <Badge color="green">Active</Badge>
                            <div className="flex gap-1">
                              <Can permission="diet.order">
                                <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setEditPlan(plan)}>Edit</Button>
                                <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => openRenew(plan)}>Renew</Button>
                                <Button variant="ghost" className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => openCancelPlan(plan)}>Cancel</Button>
                              </Can>
                            </div>
                          </div>
                        </div>
                      </div>
                      {plan.pathya && <p className="text-xs text-slate-700 mt-2"><span className="font-semibold text-slate-900">Pathya:</span> {plan.pathya}</p>}
                      {plan.apathya && <p className="text-xs text-slate-700 mt-1"><span className="font-semibold text-slate-900">Apathya:</span> {plan.apathya}</p>}
                      {plan.special_instructions && <p className="text-xs text-slate-700 mt-1"><span className="font-semibold text-slate-900">Notes:</span> {plan.special_instructions}</p>}
                      <p className="text-[10px] text-slate-400 mt-2">Prescribed by {plan.ordered_by_name}</p>
                    </div>
                  ))
                )}
                {dietPlans.filter(p => p.is_active).length === 0 && (
                  <Can permission="diet.order">
                    <p className="text-[10px] text-slate-400 italic">Use "+ Diet Plan" to prescribe one.</p>
                  </Can>
                )}
              </div>

              {/* Diet Plan History (previously active / cancelled) */}
              {dietPlans.filter(p => !p.is_active).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Diet Plan History</h4>
                  <div className="space-y-2">
                    {dietPlans.filter(p => !p.is_active).map(plan => (
                      <div key={plan.id} className="rounded-lg border border-slate-100 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-700">{plan.diet_type}</p>
                          <Badge color={plan.cancelled_at ? 'red' : 'slate'}>{plan.cancelled_at ? 'Cancelled' : 'Inactive'}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(plan.start_date).toLocaleDateString()} → {new Date(plan.end_date).toLocaleDateString()} {plan.ordered_by_name && `• By ${plan.ordered_by_name}`}
                        </p>
                        {plan.cancelled_at && (
                          <p className="text-[10px] text-rose-500 mt-0.5">Cancelled {new Date(plan.cancelled_at).toLocaleString()}{plan.cancelled_by_name && ` by ${plan.cancelled_by_name}`}{plan.cancellation_reason && ` — ${plan.cancellation_reason}`}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy/Simple Diet Instructions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Diet Orders History</h4>
                {adm.diet_orders.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No basic diet instructions.</p>
                ) : (
                  <div className="space-y-2">
                    {adm.diet_orders.map((d) => (
                      <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{d.diet_type}</p>
                          <p className="text-xs text-slate-500">
                            {d.schedule && `${d.schedule} • `}{d.instructions && `${d.instructions} • `}{d.ordered_by && `By ${d.ordered_by}`}
                          </p>
                        </div>
                        <Badge color={d.status === 'SERVED' ? 'green' : d.status === 'PREPARED' ? 'blue' : d.status === 'HELD' ? 'amber' : 'slate'}>
                          {d.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {adm.bed_history.length > 0 && (
            <Card>
              <CardHeader title="Bed History" />
              <div className="p-5">
                <div className="space-y-2">
                  {adm.bed_history.map((h) => (
                    <div key={h.id} className="rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{h.bed_no} — {h.ward_name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(h.from_date).toLocaleString()}{h.to_date ? ` → ${new Date(h.to_date).toLocaleString()}` : ''}
                        </span>
                      </div>
                      {h.reason && <p className="mt-0.5 text-xs text-slate-500">{h.reason} {h.changed_by && `• By ${h.changed_by}`}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {isActive && (
        <Card className="mb-6">
          <CardHeader title="Transfer Bed" subtitle="Move this patient to another bed" />
          <form onSubmit={transferBed} className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Target Bed (available)">
                <Select value={transferForm.bed_id} onChange={(e) => setTransferForm({ ...transferForm, bed_id: e.target.value })} required>
                  <option value="">Select bed</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>{b.bed_no} — {b.ward_name || 'Ward'}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Reason">
              <Input value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} placeholder="e.g. Isolation, patient request" />
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={loading || !transferForm.bed_id}>{loading ? 'Transferring...' : 'Transfer Bed'}</Button>
            </div>
          </form>
        </Card>
      )}

      {isActive && (
        <Card className="mb-6 border-red-100">
          <CardHeader
            title="Discharge"
            subtitle="Complete the discharge summary and release the bed"
            action={
              <Can permission="admission.discharge">
                <Button variant="danger" onClick={() => setShowDischargeForm((v) => !v)}>{showDischargeForm ? 'Close' : 'Start Discharge'}</Button>
              </Can>
            }
          />
          {showDischargeForm && (
            <form onSubmit={discharge} className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Discharge Type *">
                <Select value={dischargeForm.discharge_type} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_type: e.target.value })}>
                  {DISCHARGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Discharge Date">
                <Input type="date" value={dischargeForm.discharge_date} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_date: e.target.value })} />
              </Field>
              <Field label="Discharge Time">
                <Input type="time" value={dischargeForm.discharge_time} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_time: e.target.value })} />
              </Field>
              <Field label="Follow-up Date">
                <Input type="date" value={dischargeForm.follow_up_date} onChange={(e) => setDischargeForm({ ...dischargeForm, follow_up_date: e.target.value })} />
              </Field>
              <Field label="Final Diagnosis">
                <Input value={dischargeForm.final_diagnosis} onChange={(e) => setDischargeForm({ ...dischargeForm, final_diagnosis: e.target.value })} />
              </Field>
              <Field label="Treatment Given">
                <Input value={dischargeForm.treatment_given} onChange={(e) => setDischargeForm({ ...dischargeForm, treatment_given: e.target.value })} />
              </Field>
              <Field label="Procedures Done">
                <Input value={dischargeForm.procedures_done} onChange={(e) => setDischargeForm({ ...dischargeForm, procedures_done: e.target.value })} />
              </Field>
              <Field label="Medicines at Discharge">
                <Input value={dischargeForm.medicines_at_discharge} onChange={(e) => setDischargeForm({ ...dischargeForm, medicines_at_discharge: e.target.value })} />
              </Field>
              <Field label="Follow-up Instructions">
                <Input value={dischargeForm.follow_up_instructions} onChange={(e) => setDischargeForm({ ...dischargeForm, follow_up_instructions: e.target.value })} />
              </Field>
              <Field label="Discharge Notes">
                <Input value={dischargeForm.discharge_notes} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_notes: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Summary">
                  <Textarea value={dischargeForm.summary} onChange={(e) => setDischargeForm({ ...dischargeForm, summary: e.target.value })} rows={4} placeholder="Complete discharge summary..." />
                </Field>
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" variant="danger" disabled={loading}>{loading ? 'Discharging...' : 'Confirm Discharge'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowDischargeForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {adm.status === 'DISCHARGED' && adm.discharge && (
        <Card className="mb-6 border-emerald-100">
          <CardHeader
            title="Discharge Summary"
            subtitle={`${adm.discharge.discharge_type}${adm.discharged_at ? ` • ${new Date(adm.discharged_at).toLocaleDateString()}` : ''}${adm.discharged_by ? ` • By ${adm.discharged_by}` : ''}`}
            action={<Badge color="green">Discharged</Badge>}
          />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {adm.discharge.final_diagnosis && <div><p className="text-xs font-bold uppercase text-slate-400">Final Diagnosis</p><p className="mt-1 text-sm text-slate-700">{adm.discharge.final_diagnosis}</p></div>}
            {adm.discharge.treatment_given && <div><p className="text-xs font-bold uppercase text-slate-400">Treatment Given</p><p className="mt-1 text-sm text-slate-700">{adm.discharge.treatment_given}</p></div>}
            {adm.discharge.procedures_done && <div><p className="text-xs font-bold uppercase text-slate-400">Procedures</p><p className="mt-1 text-sm text-slate-700">{adm.discharge.procedures_done}</p></div>}
            {adm.discharge.medicines_at_discharge && <div><p className="text-xs font-bold uppercase text-slate-400">Medicines</p><p className="mt-1 text-sm text-slate-700">{adm.discharge.medicines_at_discharge}</p></div>}
            {adm.discharge.follow_up_instructions && <div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Follow-up</p><p className="mt-1 text-sm text-slate-700">{adm.discharge.follow_up_instructions}</p></div>}
            {adm.discharge.discharge_notes && <div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Discharge Notes</p><p className="mt-1 text-sm text-slate-700">{adm.discharge.discharge_notes}</p></div>}
            {adm.discharge.summary && <div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Summary</p><p className="mt-1 text-sm text-slate-700">{adm.discharge.summary}</p></div>}
          </div>
        </Card>
      )}

      <Button variant="secondary" onClick={() => navigate('/admin/admissions')}>← Back to Admissions</Button>

      {(showPrescribe || editPlan) && (
        <PrescribeDietModal
          admissionId={adm.id}
          patientId={adm.patient_id}
          plan={editPlan ?? undefined}
          onClose={() => {
            setShowPrescribe(false)
            setEditPlan(null)
          }}
          onDone={() => {
            setShowPrescribe(false)
            setEditPlan(null)
            load()
          }}
        />
      )}

      {/* Renew Diet Plan Modal */}
      {renewPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground">Renew Diet Plan</h2>
              <button onClick={() => setRenewPlan(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Extend <span className="font-semibold text-foreground">{renewPlan.diet_type}</span> (current end:{' '}
                {new Date(renewPlan.end_date).toLocaleDateString()}) to a new end date.
              </p>
              <Field label="New End Date *">
                <Input type="date" value={renewEndDate} onChange={e => setRenewEndDate(e.target.value)} />
              </Field>
              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRenewPlan(null)}>Back</Button>
                <Button variant="primary" onClick={handleRenew} disabled={renewing}>
                  {renewing ? 'Renewing...' : 'Confirm Renewal'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Diet Plan Modal */}
      {cancelPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground">Cancel Diet Plan</h2>
              <button onClick={() => setCancelPlan(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Deactivate <span className="font-semibold text-foreground">{cancelPlan.diet_type}</span> for this admission. History is preserved.
              </p>
              <Field label="Reason (optional)">
                <Input value={cancelPlanReason} onChange={e => setCancelPlanReason(e.target.value)} placeholder="e.g., switched to another regimen" />
              </Field>
              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCancelPlan(null)}>Back</Button>
                <Button variant="danger" onClick={handleCancelPlan} disabled={cancellingPlan}>
                  {cancellingPlan ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
