import { useCallback, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

interface PatientRecord {
  id: string
  uhid: string
  full_name: string
  gender: string
  dob: string
  age: number
  mobile: string
  alternate_mobile: string
  email: string
  blood_group: string
  marital_status: string
  occupation: string
  photo_url: string
  address: string
  city: string
  state: string
  district: string
  pincode: string
  country: string
  emergency_contact_name: string
  emergency_contact_relation: string
  emergency_contact: string
  emergency_contact_address: string
  height_cm: number
  weight_kg: number
  blood_pressure: string
  pulse: string
  sugar: string
  allergies: string
  chronic_diseases: string
  current_medication: string
  registration_type: string
  referred_by: string
  branch: string
  remarks: string
  is_active: boolean
  created_at: string
}

interface TimelineDiagnosis {
  id: string
  diagnosis: string
  diagnosis_type: string
  notes: string
}

interface TimelineConsultation {
  consultation_id: string
  chief_complaints: string
  clinical_notes: string
  treatment_plan: string
  created_at: string
  diagnoses: TimelineDiagnosis[]
}

interface TimelinePrescriptionItem {
  medicine: string
  formulation: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  anupana: string
  dispensed_qty: number
}

interface TimelinePrescription {
  prescription_id: string
  status: string
  notes: string
  created_at: string
  items: TimelinePrescriptionItem[]
}

interface TimelineEncounter {
  encounter_id: string
  visit_date: string
  department_name: string
  doctor_name: string
  visit_type: string
  token_number: number
  status: string
  diagnoses: TimelineDiagnosis[]
  consultations: TimelineConsultation[]
  prescriptions: TimelinePrescription[]
}

interface TimelineSession {
  session_number: number
  session_date: string
  therapist_name?: string
  status: string
  before_condition?: string
  after_condition?: string
  complications?: string
  observations?: string
}

interface TimelineTreatmentPlan {
  plan_id: string
  plan_no: string
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
  approved_by?: string
  final_assessment?: string
  completed_by?: string
  created_at: string
  sessions: TimelineSession[]
}

interface Timeline {
  patient_id: string
  uhid: string
  patient_name: string
  gender: string
  age: number
  mobile: string
  encounters: TimelineEncounter[]
  treatment_plans: TimelineTreatmentPlan[]
}

interface Appointment {
  id: string
  doctor_name: string
  appointment_date: string
  token_number: number
  status: string
  reason: string
  created_at: string
}

interface PrescriptionBadgeItem {
  id: string
  medicine: string
  formulation: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  dispensed_qty: number
}

interface PrescriptionBadge {
  id: string
  encounter_id: string
  doctor_name: string
  status: string
  notes: string
  created_at: string
  items: PrescriptionBadgeItem[]
}

interface BillItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Payment {
  id: string
  amount: number
  method: string
  reference: string
  created_at: string
}

interface Bill {
  id: string
  bill_no: string
  total_amount: number
  discount: number
  net_amount: number
  paid_amount: number
  due_amount: number
  payment_status: string
  billed_by: string
  created_at: string
  items: BillItem[]
  payments: Payment[]
}

type TabKey = 'personal' | 'timeline' | 'appointments' | 'prescriptions' | 'bills' | 'documents'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'personal', label: 'Personal Details' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'bills', label: 'Bills' },
  { key: 'documents', label: 'Documents' },
]

function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            active === t.key
              ? 'border border-b-0 border-slate-200 bg-white text-teal-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value?: string | number }) {
  const v = value === undefined || value === null || value === '' ? '—' : value
  return (
    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{v}</p>
    </div>
  )
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Timeline | null>(null)
  const [patient, setPatient] = useState<PatientRecord | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('personal')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionBadge[]>([])
  const [bills, setBills] = useState<Bill[]>([])

  // Edit Form Fields State
  const [form, setForm] = useState({
    full_name: '',
    gender: 'MALE',
    dob: '',
    age: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    blood_group: '',
    marital_status: '',
    occupation: '',
    photo_url: '',
    address: '',
    city: '',
    state: '',
    district: '',
    pincode: '',
    country: 'India',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact: '',
    emergency_contact_address: '',
    height_cm: '',
    weight_kg: '',
    blood_pressure: '',
    pulse: '',
    sugar: '',
    allergies: '',
    chronic_diseases: '',
    current_medication: '',
    registration_type: 'WALK_IN',
    referred_by: '',
    remarks: '',
    is_active: true
  })

  const loadData = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get<{ data: Timeline }>(`/patients/${id}/timeline`),
      api.get<{ data: PatientRecord }>(`/patients/${id}`),
      api.get<{ data: Appointment[] }>(`/appointments?patient_id=${id}`),
      api.get<{ data: PrescriptionBadge[] }>(`/prescriptions?patient_id=${id}`),
      api.get<{ data: Bill[] }>(`/bills?patient_id=${id}`),
    ])
      .then(([tl, pat, appts, rx, bls]) => {
        setData(tl.data.data)
        setPatient(pat.data.data)
        setAppointments(appts.data.data)
        setPrescriptions(rx.data.data)
        setBills(bls.data.data)
        // Populate edit form
        const p = pat.data.data
        setForm({
          full_name: p.full_name,
          gender: p.gender || 'MALE',
          dob: p.dob ? p.dob.split('T')[0] : '',
          age: String(p.age),
          mobile: p.mobile,
          alternate_mobile: p.alternate_mobile || '',
          email: p.email || '',
          blood_group: p.blood_group || '',
          marital_status: p.marital_status || '',
          occupation: p.occupation || '',
          photo_url: p.photo_url || '',
          address: p.address || '',
          city: p.city || '',
          state: p.state || '',
          district: p.district || '',
          pincode: p.pincode || '',
          country: p.country || 'India',
          emergency_contact_name: p.emergency_contact_name || '',
          emergency_contact_relation: p.emergency_contact_relation || '',
          emergency_contact: p.emergency_contact || '',
          emergency_contact_address: p.emergency_contact_address || '',
          height_cm: p.height_cm ? String(p.height_cm) : '',
          weight_kg: p.weight_kg ? String(p.weight_kg) : '',
          blood_pressure: p.blood_pressure || '',
          pulse: p.pulse || '',
          sugar: p.sugar || '',
          allergies: p.allergies || '',
          chronic_diseases: p.chronic_diseases || '',
          current_medication: p.current_medication || '',
          registration_type: p.registration_type || 'WALK_IN',
          referred_by: p.referred_by || '',
          remarks: p.remarks || '',
          is_active: p.is_active
        })
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load patient')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/patients/${id}`, {
        ...form,
        age: Number(form.age) || 0,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      })
      setShowEditForm(false)
      loadData()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update patient details'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this patient profile? This action cannot be undone.')) return
    setError('')
    try {
      await api.delete(`/patients/${id}`)
      navigate('/admin/patients')
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete patient. They may have active bills or encounters.'))
    }
  }

  if (error && !patient) return <EmptyState message={error} />
  if (loading || !data || !patient) return <Spinner label="Loading patient profile..." />

  const statusColor = (s: string) =>
    s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : s === 'IN_CONSULTATION' ? 'blue' : 'amber'

  return (
    <div>
      <PageHeader
        title={patient.full_name}
        subtitle={`${patient.uhid} • ${patient.gender} • Age ${patient.age}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="px-3 py-1.5 text-xs font-semibold" onClick={() => navigate('/admin/patients')}>
              Back to List
            </Button>
            <Can permission="patient.update">
              <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => setShowEditForm(!showEditForm)}>
                {showEditForm ? 'Cancel Edit' : 'Edit Profile'}
              </Button>
            </Can>
            <Can permission="patient.delete">
              <Button variant="danger" className="px-3 py-1.5 text-xs font-semibold" onClick={handleDelete}>
                Delete Patient
              </Button>
            </Can>
            <Can permission="appointment.create">
              <Link to="/admin/appointments">
                <Button className="px-3 py-1.5 text-xs font-semibold">+ Book Appointment</Button>
              </Link>
            </Can>
          </div>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Edit Form */}
      {showEditForm && (
        <Card className="mb-8">
          <CardHeader title="Edit Patient Details" />
          <form onSubmit={handleUpdate} className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Full Name *">
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </Field>
              <Field label="Gender *">
                <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </Select>
              </Field>
              <Field label="Age *">
                <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
              </Field>
              <Field label="Mobile *">
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
              </Field>
              <Field label="Alternate Mobile">
                <Input value={form.alternate_mobile} onChange={(e) => setForm({ ...form, alternate_mobile: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Date of Birth (YYYY-MM-DD)">
                <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </Field>
              <Field label="Blood Group">
                <Input value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} placeholder="e.g. A+, B-" />
              </Field>
              <Field label="Marital Status">
                <Select value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })}>
                  <option value="">Select</option>
                  <option value="UNMARRIED">UNMARRIED</option>
                  <option value="MARRIED">MARRIED</option>
                  <option value="DIVORCED">DIVORCED</option>
                  <option value="WIDOWED">WIDOWED</option>
                </Select>
              </Field>
              <Field label="Occupation">
                <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
              </Field>
              <Field label="Registration Type">
                <Select value={form.registration_type} onChange={(e) => setForm({ ...form, registration_type: e.target.value })}>
                  <option value="WALK_IN">WALK_IN</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="REFERRAL">REFERRAL</option>
                </Select>
              </Field>
              <Field label="Referred By">
                <Input value={form.referred_by} onChange={(e) => setForm({ ...form, referred_by: e.target.value })} />
              </Field>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-teal-800">Address Details</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </Field>
                </div>
                <Field label="City">
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Field>
                <Field label="State">
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </Field>
                <Field label="District">
                  <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </Field>
                <Field label="Pincode">
                  <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-teal-800">Status & Remarks</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <Select value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                    <option value="true">ACTIVE</option>
                    <option value="false">INACTIVE</option>
                  </Select>
                </Field>
                <Field label="Remarks">
                  <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </Field>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Update Details'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowEditForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Details view */}
      {activeTab === 'personal' && (
      <Card className="mb-8">
        <CardHeader title="Patient Clinical Profile" subtitle={`Registered ${new Date(patient.created_at).toLocaleDateString()} • ${patient.registration_type}`} />
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            {patient.photo_url ? (
              <img src={patient.photo_url} alt="patient" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-teal-50" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-2xl font-bold text-teal-700 ring-2 ring-teal-50">
                {patient.full_name.split(' ')[0]?.[0] || 'P'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">{patient.full_name}</h2>
                <Badge color={patient.is_active ? 'green' : 'red'}>{patient.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">UHID: {patient.uhid}</p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-800">Basic Information</p>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              <InfoItem label="Full Name" value={patient.full_name} />
              <InfoItem label="Gender" value={patient.gender} />
              <InfoItem label="Age" value={patient.age} />
              <InfoItem label="Date of Birth" value={patient.dob ? patient.dob.split('T')[0] : '—'} />
              <InfoItem label="Mobile" value={patient.mobile} />
              <InfoItem label="Alternate Mobile" value={patient.alternate_mobile} />
              <InfoItem label="Email" value={patient.email} />
              <InfoItem label="Blood Group" value={patient.blood_group} />
              <InfoItem label="Marital Status" value={patient.marital_status} />
              <InfoItem label="Occupation" value={patient.occupation} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-800">Address Details</p>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              <div className="col-span-2">
                <InfoItem label="Address" value={patient.address} />
              </div>
              <InfoItem label="City" value={patient.city} />
              <InfoItem label="District" value={patient.district} />
              <InfoItem label="State" value={patient.state} />
              <InfoItem label="Pincode" value={patient.pincode} />
            </div>
          </div>

          {(patient.emergency_contact_name || patient.emergency_contact) && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-800">Emergency Contact</p>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <InfoItem label="Contact Name" value={patient.emergency_contact_name} />
                <InfoItem label="Relation" value={patient.emergency_contact_relation} />
                <InfoItem label="Phone Number" value={patient.emergency_contact} />
                <InfoItem label="Address" value={patient.emergency_contact_address} />
              </div>
            </div>
          )}

          {(patient.height_cm || patient.weight_kg || patient.blood_pressure) && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-800">Vitals & Measurements</p>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                <InfoItem label="Height" value={patient.height_cm ? `${patient.height_cm} cm` : '—'} />
                <InfoItem label="Weight" value={patient.weight_kg ? `${patient.weight_kg} kg` : '—'} />
                <InfoItem label="Blood Pressure" value={patient.blood_pressure} />
                <InfoItem label="Pulse Rate" value={patient.pulse} />
                <InfoItem label="Sugar Level" value={patient.sugar} />
              </div>
            </div>
          )}

          {(patient.referred_by || patient.remarks) && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-800">Registration Details</p>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                <InfoItem label="Referred By" value={patient.referred_by} />
                <div className="col-span-2">
                  <InfoItem label="Remarks" value={patient.remarks} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      )}

      {activeTab === 'timeline' && (
      <>
      <h2 className="mb-3 text-lg font-semibold text-slate-800">Care Timeline</h2>
      {!data.encounters || data.encounters.length === 0 ? (
        <Card>
          <EmptyState message="No encounters yet for this patient" />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.encounters.map((enc) => (
            <Card key={enc.encounter_id}>
              <CardHeader
                title={`${enc.department_name} • ${enc.doctor_name}`}
                subtitle={`${new Date(enc.visit_date).toLocaleDateString()} • Token #${enc.token_number} • ${enc.visit_type}`}
                action={<Badge color={statusColor(enc.status)}>{enc.status}</Badge>}
              />
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Diagnoses</p>
                  {!enc.diagnoses || enc.diagnoses.length === 0 ? (
                    <p className="text-sm text-slate-500">None recorded</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {enc.diagnoses.map((d) => (
                        <Badge key={d.id} color="purple">
                          {d.diagnosis_type}: {d.diagnosis}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {(enc.consultations || []).map((c) => (
                  <div key={c.consultation_id} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Consultation • {new Date(c.created_at).toLocaleString()}
                    </p>
                    {c.chief_complaints && (
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-medium">Complaints:</span> {c.chief_complaints}
                      </p>
                    )}
                    {c.treatment_plan && (
                      <p className="mt-1 text-sm text-slate-700">
                        <span className="font-medium">Plan:</span> {c.treatment_plan}
                      </p>
                    )}
                    {c.clinical_notes && (
                      <p className="mt-1 text-sm text-slate-700">
                        <span className="font-medium">Notes:</span> {c.clinical_notes}
                      </p>
                    )}
                  </div>
                ))}

                {(enc.prescriptions || []).map((rx) => (
                  <div key={rx.prescription_id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Prescription • {new Date(rx.created_at).toLocaleString()}
                      </p>
                      <Badge color={rx.status === 'DISPENSED' ? 'green' : rx.status === 'PARTIALLY_DISPENSED' ? 'amber' : 'blue'}>
                        {rx.status}
                      </Badge>
                    </div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                          <tr className="text-left text-xs text-slate-400">
                            <th className="py-1 pr-4">Medicine</th>
                            <th className="py-1 pr-4">Dose</th>
                            <th className="py-1 pr-4">Frequency</th>
                            <th className="py-1 pr-4">Duration</th>
                            <th className="py-1">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rx.items || []).map((item, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="py-1.5 pr-4 font-medium text-slate-700">{item.medicine}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{item.dose}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{item.frequency}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{item.duration}</td>
                              <td className="py-1.5 text-slate-600">
                                {item.dispensed_qty}/{item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {(data.treatment_plans && data.treatment_plans.length > 0) && (
        <div className="mt-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Treatment Plans</h2>
          <div className="space-y-4">
            {data.treatment_plans.map((plan) => (
              <Card key={plan.plan_id}>
                <CardHeader
                  title={`${plan.procedure_name} (${plan.procedure_category})`}
                  subtitle={`${plan.plan_no} • ${plan.doctor_name} • ${new Date(plan.start_date).toLocaleDateString()}${plan.end_date ? ' → ' + new Date(plan.end_date).toLocaleDateString() : ''}`}
                  action={<Badge color={plan.status === 'COMPLETED' ? 'green' : plan.status === 'CANCELLED' ? 'red' : 'blue'}>{plan.status}</Badge>}
                />
                <div className="space-y-4 p-5">
                  {plan.indication && (
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Indication:</span> {plan.indication}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    {plan.planned_sessions} sessions • {plan.frequency}{' '}
                    {plan.therapist_name && <>• Therapist: {plan.therapist_name}</>}
                    {plan.approved_by && <>• Approved by: {plan.approved_by}</>}
                  </p>
                  {plan.final_assessment && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                      <p className="text-xs font-semibold uppercase text-emerald-700">Final Assessment</p>
                      <p className="mt-1 text-sm text-slate-700">{plan.final_assessment}</p>
                    </div>
                  )}
                  {(plan.sessions || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                          <tr className="text-left text-xs text-slate-400">
                            <th className="py-1 pr-4">#</th>
                            <th className="py-1 pr-4">Date</th>
                            <th className="py-1 pr-4">Status</th>
                            <th className="py-1 pr-4">Therapist</th>
                            <th className="py-1 pr-4">Before</th>
                            <th className="py-1 pr-4">After</th>
                            <th className="py-1">Complications</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.sessions.map((s) => (
                            <tr key={s.session_number} className="border-t border-slate-100">
                              <td className="py-1.5 pr-4 font-mono text-xs text-slate-500">{s.session_number}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{s.session_date}</td>
                              <td className="py-1.5 pr-4">
                                <Badge color={s.status === 'COMPLETED' ? 'green' : s.status === 'SKIPPED' ? 'red' : s.status === 'IN_PROGRESS' ? 'blue' : 'slate'}>
                                  {s.status}
                                </Badge>
                              </td>
                              <td className="py-1.5 pr-4 text-slate-600">{s.therapist_name || '—'}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{s.before_condition || '—'}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{s.after_condition || '—'}</td>
                              <td className="py-1.5 text-slate-600">{s.complications || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      </>)}

      {activeTab === 'appointments' && (
        <Card>
          <CardHeader title="Appointments" />
          <div className="p-5">
            {appointments.length === 0 ? (
              <EmptyState message="No appointments found for this patient" />
            ) : (
              <div className="space-y-3">
                {appointments.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.doctor_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(a.appointment_date).toLocaleDateString()} • Token #{a.token_number}
                      </p>
                      {a.reason && <p className="mt-1 text-xs text-slate-500">{a.reason}</p>}
                    </div>
                    <Badge color={statusColor(a.status)}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'prescriptions' && (
        <Card>
          <CardHeader title="Prescriptions" />
          <div className="p-5">
            {prescriptions.length === 0 ? (
              <EmptyState message="No prescriptions found for this patient" />
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          {new Date(rx.created_at).toLocaleString()} • {rx.doctor_name}
                        </p>
                        {rx.notes && <p className="mt-1 text-sm text-slate-600">{rx.notes}</p>}
                      </div>
                      <Badge color={rx.status === 'DISPENSED' ? 'green' : rx.status === 'PARTIALLY_DISPENSED' ? 'amber' : 'blue'}>
                        {rx.status}
                      </Badge>
                    </div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                          <tr className="text-left text-xs text-slate-400">
                            <th className="py-1 pr-4">Medicine</th>
                            <th className="py-1 pr-4">Dose</th>
                            <th className="py-1 pr-4">Frequency</th>
                            <th className="py-1 pr-4">Duration</th>
                            <th className="py-1">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rx.items || []).map((item, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="py-1.5 pr-4 font-medium text-slate-700">{item.medicine}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{item.dose}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{item.frequency}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{item.duration}</td>
                              <td className="py-1.5 text-slate-600">
                                {item.dispensed_qty}/{item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'bills' && (
        <Card>
          <CardHeader title="Bills" />
          <div className="p-5">
            {bills.length === 0 ? (
              <EmptyState message="No bills found for this patient" />
            ) : (
              <div className="space-y-3">
                {bills.map((b) => (
                  <div key={b.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{b.bill_no}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(b.created_at).toLocaleDateString()} • Billed by {b.billed_by}
                        </p>
                      </div>
                      <Badge color={b.payment_status === 'PAID' ? 'green' : b.payment_status === 'PARTIAL' ? 'amber' : 'red'}>
                        {b.payment_status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-4">
                      <InfoItem label="Total" value={`₹${b.total_amount.toLocaleString('en-IN')}`} />
                      <InfoItem label="Discount" value={`₹${b.discount.toLocaleString('en-IN')}`} />
                      <InfoItem label="Paid" value={`₹${b.paid_amount.toLocaleString('en-IN')}`} />
                      <InfoItem label="Due" value={`₹${b.due_amount.toLocaleString('en-IN')}`} />
                    </div>
                    {b.items.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-sm whitespace-nowrap">
                          <thead>
                            <tr className="text-left text-xs text-slate-400">
                              <th className="py-1 pr-4">Description</th>
                              <th className="py-1 pr-4">Qty</th>
                              <th className="py-1 pr-4">Rate</th>
                              <th className="py-1">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.items.map((it) => (
                              <tr key={it.id} className="border-t border-slate-100">
                                <td className="py-1.5 pr-4 font-medium text-slate-700">{it.description}</td>
                                <td className="py-1.5 pr-4 text-slate-600">{it.quantity}</td>
                                <td className="py-1.5 pr-4 text-slate-600">₹{it.rate}</td>
                                <td className="py-1.5 text-slate-600">₹{it.amount.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardHeader title="Documents" />
          <div className="p-5">
            <EmptyState message="Documents feature is coming soon. Prescription slips can already be printed from the Prescriptions page." />
          </div>
        </Card>
      )}
    </div>
  )
}
