import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Badge, Spinner, PageHeader, Button, Input, Field } from '../../components/ui'
import { User, Activity, ChevronDown, ChevronRight, Stethoscope, FileText, ClipboardList, ArrowLeftRight } from 'lucide-react'

interface Diagnosis {
  id: string
  diagnosis: string
  icd_code: string
  diagnosis_type: string
  notes: string
}

interface Encounter {
  id: string
  patient_id: string
  uhid: string
  patient_name: string
  patient_age: number
  patient_gender: string
  department_name: string
  doctor_name: string
  visit_type: string
}

interface Vitals {
  height: string
  weight: string
  temperature: string
  pulse: string
  bp_systolic: string
  bp_diastolic: string
  respiratory_rate: string
  spo2: string
  blood_sugar: string
}

interface Consultation {
  id: string
  encounter_id: string
  doctor_name: string
  chief_complaints: string
  history: string
  examination: string
  clinical_notes: string
  treatment_plan: string
  diet_pathya: string
  diet_apathya: string
  follow_up_date: string
  status: string
  diagnoses: Diagnosis[]
  ayurveda_fields: Record<string, unknown>
  vitals: Vitals | null
  investigations: string[]
  procedures: string[]
  created_at: string
}

const DOSHA_OPTIONS = ['Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Sama']
const AGNI_OPTIONS = ['Sama (Normal)', 'Vishama (Irregular)', 'Tikshna (Sharp)', 'Manda (Slow)', 'Hindi (Avid)']
const KOSHTHA_OPTIONS = ['Krura (Hard)', 'Mrdu (Soft)', 'Madhyama (Moderate)']
const SATVA_OPTIONS = ['Pravara (Strong)', 'Madhyama (Moderate)', 'Avara (Weak)']
const SATMYA_OPTIONS = ['Pravara (High)', 'Madhyama (Moderate)', 'Avara (Low)']
const NIDRA_OPTIONS = ['Normal', 'Insomnia', 'Hypersomnia', 'Disturbed']
const MALA_OPTIONS = ['Regular', 'Constipated', 'Loose', 'Mixed']
const MUTRA_OPTIONS = ['Clear', 'Turbid', 'Dark', 'Scanty', 'Excessive']
const JIHVA_OPTIONS = ['Clean', 'Coated', 'Cracked', 'Discolored', 'Enlarged']
const STATUS_OPTIONS = ['ONGOING', 'COMPLETED', 'FOLLOW_UP', 'REFERRED']

const INVESTIGATION_OPTIONS = [
  'CBC', 'ESR', 'Blood Sugar (Fasting)', 'Blood Sugar (Post Prandial)',
  'Lipid Profile', 'LFT', 'KFT', 'Thyroid Profile',
  'Urine Routine', 'Stool Routine',
  'X-Ray', 'USG', 'MRI', 'CT Scan', 'ECG', 'Echo',
]

const PROCEDURE_OPTIONS = [
  'Panchakarma', 'Vamana', 'Virechana', 'Basti', 'Nasya', 'Raktamokshana',
  'Abhyanga', 'Shirodhara', 'Pizhichil', 'Njavarakizhi',
  'Kshar Sutra', 'Agnikarma',
  'Local Medication', 'Purvakarma', 'Pradhanakarma', 'Paschatkarma',
]

const defaultVitals: Vitals = {
  height: '', weight: '', temperature: '', pulse: '',
  bp_systolic: '', bp_diastolic: '', respiratory_rate: '', spo2: '', blood_sugar: '',
}

const defaultAyurveda = {
  prakriti: '', vikriti: '', dosha: '', agni: '', koshtha: '',
  satva: '', satmya: '', nidra: '', mala: '', mutra: '', jihva: '',
  nadi: '', ashtavidha: {
    nadi: '', mutra: '', mala: '', jihva: '', shabda: '', sparsha: '', drik: '', aakruti: '',
  } as Record<string, string>,
  dashavidha: {
    prakriti: '', vikriti: '', sara: '', samhanana: '', pramana: '',
    satmya: '', satva: '', ahara_shakti: '', vyayama_shakti: '', vaya: '',
  } as Record<string, string>,
}

const ashtavidhaLabels: Record<string, string> = {
  nadi: 'Nadi (Pulse)',
  mutra: 'Mutra (Urine)',
  mala: 'Mala (Stool)',
  jihva: 'Jihva (Tongue)',
  shabda: 'Shabda (Voice)',
  sparsha: 'Sparsha (Touch)',
  drik: 'Drik (Eyes)',
  aakruti: 'Aakruti (Appearance)',
}

const dashavidhaLabels: Record<string, string> = {
  prakriti: 'Prakriti (Constitution)',
  vikriti: 'Vikriti (Current State)',
  sara: 'Sara (Vitality)',
  samhanana: 'Samhanana (Build)',
  pramana: 'Pramana (Measurement)',
  satmya: 'Satmya (Adaptability)',
  satva: 'Satva (Mental Strength)',
  ahara_shakti: 'Ahara Shakti (Digestive Power)',
  vyayama_shakti: 'Vyayama Shakti (Exercise Capacity)',
  vaya: 'Vaya (Age)',
}

function Accordion({ title, icon, children, defaultOpen = false }: { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 transition-colors">
        {icon}
        <span className="flex-1 text-sm font-semibold text-slate-700">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-200 bg-white p-4 space-y-3">{children}</div>}
    </div>
  )
}

export default function Consultation() {
  const { id } = useParams()
  const [existing, setExisting] = useState<Consultation | null>(null)
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    chief_complaints: '',
    history: '',
    examination: '',
    clinical_notes: '',
    treatment_plan: '',
    diet_pathya: '',
    diet_apathya: '',
    follow_up_date: '',
    status: 'ONGOING',
    diagnoses: [] as { diagnosis: string; icd_code: string; diagnosis_type: string; notes: string }[],
    investigations: [] as string[],
    investigation_other: '',
    procedures: [] as string[],
    procedure_other: '',
    vitals: { ...defaultVitals },
    ayurveda: { ...defaultAyurveda, ashtavidha: { ...defaultAyurveda.ashtavidha }, dashavidha: { ...defaultAyurveda.dashavidha } },
  })

  useEffect(() => {
    Promise.all([
      api.get<{ data: Encounter }>(`/encounters/${id}`).then(res => setEncounter(res.data.data)).catch(() => setEncounter(null)),
      api
        .get<{ data: Consultation }>(`/encounters/${id}/consultation`)
        .then((res) => {
          const c = res.data.data
          setExisting(c)
          const af = (c.ayurveda_fields || {}) as Record<string, unknown>
          setForm({
            chief_complaints: c.chief_complaints || '',
            history: c.history || '',
            examination: c.examination || '',
            clinical_notes: c.clinical_notes || '',
            treatment_plan: c.treatment_plan || '',
            diet_pathya: c.diet_pathya || '',
            diet_apathya: c.diet_apathya || '',
            follow_up_date: c.follow_up_date || '',
            status: c.status || 'ONGOING',
            diagnoses: c.diagnoses?.map(d => ({ diagnosis: d.diagnosis, icd_code: d.icd_code || '', diagnosis_type: d.diagnosis_type, notes: d.notes })) || [],
            investigations: c.investigations || [],
            investigation_other: '',
            procedures: c.procedures || [],
            procedure_other: '',
            vitals: c.vitals || { ...defaultVitals },
            ayurveda: {
              prakriti: (af.prakriti as string) || '',
              vikriti: (af.vikriti as string) || '',
              dosha: (af.dosha as string) || '',
              agni: (af.agni as string) || '',
              koshtha: (af.koshtha as string) || '',
              satva: (af.satva as string) || '',
              satmya: (af.satmya as string) || '',
              nidra: (af.nidra as string) || '',
              mala: (af.mala as string) || '',
              mutra: (af.mutra as string) || '',
              jihva: (af.jihva as string) || '',
              nadi: (af.nadi as string) || '',
              ashtavidha: { ...defaultAyurveda.ashtavidha, ...((af.ashtavidha as Record<string, string>) || {}) },
              dashavidha: { ...defaultAyurveda.dashavidha, ...((af.dashavidha as Record<string, string>) || {}) },
            },
          })
        })
        .catch(() => setExisting(null)),
    ]).finally(() => setLoaded(true))
  }, [id])

  const [dx, setDx] = useState({ diagnosis: '', icd_code: '', diagnosis_type: 'PRIMARY', notes: '' })

  const addDiagnosis = () => {
    if (!dx.diagnosis.trim()) return
    setForm(f => ({ ...f, diagnoses: [...f.diagnoses, { ...dx, diagnosis: dx.diagnosis.trim() }] }))
    setDx({ diagnosis: '', icd_code: '', diagnosis_type: 'PRIMARY', notes: '' })
  }

  const removeDiagnosis = (i: number) =>
    setForm(f => ({ ...f, diagnoses: f.diagnoses.filter((_, idx) => idx !== i) }))

  const setVitals = (key: string, value: string) =>
    setForm(f => ({ ...f, vitals: { ...f.vitals, [key]: value } }))

  const setAyurveda = (key: string, value: string) =>
    setForm(f => ({ ...f, ayurveda: { ...f.ayurveda, [key]: value } }))

  const setAshtavidha = (key: string, value: string) =>
    setForm(f => ({ ...f, ayurveda: { ...f.ayurveda, ashtavidha: { ...f.ayurveda.ashtavidha, [key]: value } } }))

  const setDashavidha = (key: string, value: string) =>
    setForm(f => ({ ...f, ayurveda: { ...f.ayurveda, dashavidha: { ...f.ayurveda.dashavidha, [key]: value } } }))

  const toggleInvestigation = (item: string) =>
    setForm(f => ({
      ...f,
      investigations: f.investigations.includes(item)
        ? f.investigations.filter(i => i !== item)
        : [...f.investigations, item],
    }))

  const toggleProcedure = (item: string) =>
    setForm(f => ({
      ...f,
      procedures: f.procedures.includes(item)
        ? f.procedures.filter(p => p !== item)
        : [...f.procedures, item],
    }))

  const bmi = useMemo(() => {
    const h = parseFloat(form.vitals.height)
    const w = parseFloat(form.vitals.weight)
    if (h > 0 && w > 0) return (w / ((h / 100) ** 2)).toFixed(1)
    return ''
  }, [form.vitals.height, form.vitals.weight])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const hasAyurveda = form.ayurveda.prakriti || form.ayurveda.vikriti || form.ayurveda.dosha
      const allInvestigations = [...form.investigations]
      if (form.investigation_other.trim()) allInvestigations.push(form.investigation_other.trim())
      const allProcedures = [...form.procedures]
      if (form.procedure_other.trim()) allProcedures.push(form.procedure_other.trim())
      const payload = {
        ...form,
        follow_up_date: form.follow_up_date || undefined,
        ayurveda_fields: hasAyurveda ? form.ayurveda : undefined,
        vitals: Object.values(form.vitals).some(v => v) ? { ...form.vitals, bmi } : undefined,
        investigations: allInvestigations.length > 0 ? allInvestigations : undefined,
        procedures: allProcedures.length > 0 ? allProcedures : undefined,
      }
      const res = await api.post<{ data: Consultation }>(`/encounters/${id}/consultation`, payload)
      setExisting(res.data.data)
    } catch (err) {
      setError(errorMessage(err, 'Failed to save consultation'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Consultation"
        subtitle={encounter ? `${encounter.patient_name} (${encounter.uhid})` : `Encounter ${id?.slice(0, 8)}`}
        action={
          <div className="flex gap-2">
            <Link to={`/admin/encounters/${id}/prescriptions`}>
              <Button variant="secondary">Prescriptions</Button>
            </Link>
            <Can permission="referral.create">
              <Link to="/admin/referrals">
                <Button variant="secondary">Refer Patient</Button>
              </Link>
            </Can>
          </div>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!loaded ? (
        <Spinner label="Loading consultation..." />
      ) : !encounter ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-sm font-medium text-amber-700">Encounter not found.</p>
          <p className="mt-1 text-xs text-amber-600">This encounter may have been deleted. Please go back and create a new encounter first.</p>
          <Link to="/admin/encounters" className="mt-4 inline-block">
            <Button variant="secondary">Go to Encounters</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* Patient Summary Card */}
          {encounter && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  <div><span className="text-emerald-600 font-medium">UHID:</span> <span className="font-mono text-emerald-800">{encounter.uhid}</span></div>
                  <div><span className="text-emerald-600 font-medium">Patient:</span> <span className="font-semibold text-emerald-800">{encounter.patient_name}</span></div>
                  <div><span className="text-emerald-600 font-medium">Age:</span> <span className="text-emerald-800">{encounter.patient_age} yrs</span></div>
                  <div><span className="text-emerald-600 font-medium">Gender:</span> <span className="text-emerald-800">{encounter.patient_gender}</span></div>
                  <div><span className="text-emerald-600 font-medium">Dept:</span> <span className="text-emerald-800">{encounter.department_name}</span></div>
                  <div><span className="text-emerald-600 font-medium">Doctor:</span> <span className="text-emerald-800">{encounter.doctor_name}</span></div>
                  <div><span className="text-emerald-600 font-medium">Visit:</span> <Badge color="blue">{encounter.visit_type}</Badge></div>
                  <div>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-xs font-medium">
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vitals */}
          <Accordion title="Vitals" icon={<Activity className="h-4 w-4 text-blue-500" />} defaultOpen={true}>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Height (cm)">
                <Input type="number" value={form.vitals.height} onChange={e => setVitals('height', e.target.value)} placeholder="170" />
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" value={form.vitals.weight} onChange={e => setVitals('weight', e.target.value)} placeholder="65" />
              </Field>
              <Field label="BMI">
                <Input value={bmi} readOnly className="bg-slate-50 font-semibold" placeholder="Auto" />
              </Field>
              <Field label="Temperature (°F)">
                <Input type="number" step="0.1" value={form.vitals.temperature} onChange={e => setVitals('temperature', e.target.value)} placeholder="98.6" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Pulse (bpm)">
                <Input type="number" value={form.vitals.pulse} onChange={e => setVitals('pulse', e.target.value)} placeholder="72" />
              </Field>
              <Field label="BP (mmHg)">
                <div className="flex gap-1">
                  <Input type="number" value={form.vitals.bp_systolic} onChange={e => setVitals('bp_systolic', e.target.value)} placeholder="120" className="w-1/2" />
                  <span className="self-center text-slate-400">/</span>
                  <Input type="number" value={form.vitals.bp_diastolic} onChange={e => setVitals('bp_diastolic', e.target.value)} placeholder="80" className="w-1/2" />
                </div>
              </Field>
              <Field label="Resp. Rate (/min)">
                <Input type="number" value={form.vitals.respiratory_rate} onChange={e => setVitals('respiratory_rate', e.target.value)} placeholder="16" />
              </Field>
              <Field label="SpO₂ (%)">
                <Input type="number" value={form.vitals.spo2} onChange={e => setVitals('spo2', e.target.value)} placeholder="98" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Blood Sugar (mg/dL)">
                <Input type="number" value={form.vitals.blood_sugar} onChange={e => setVitals('blood_sugar', e.target.value)} placeholder="Optional" />
              </Field>
            </div>
          </Accordion>

          {/* Chief Complaints */}
          <Accordion title="Chief Complaints" icon={<Stethoscope className="h-4 w-4 text-emerald-500" />} defaultOpen={true}>
            <textarea
              value={form.chief_complaints}
              onChange={e => setForm({ ...form, chief_complaints: e.target.value })}
              placeholder="e.g. Fever since 3 days, cough, body ache, loss of appetite"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </Accordion>

          {/* History */}
          <Accordion title="History" icon={<FileText className="h-4 w-4 text-amber-500" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="History of Present Illness">
                <textarea value={form.history} onChange={e => setForm({ ...form, history: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Onset, duration, progression..." />
              </Field>
              <Field label="Past Medical History">
                <textarea value={form.examination} onChange={e => setForm({ ...form, examination: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Previous illnesses, surgeries, allergies..." />
              </Field>
            </div>
          </Accordion>

          {/* Clinical Notes */}
          <Accordion title="Clinical Notes" icon={<ClipboardList className="h-4 w-4 text-purple-500" />}>
            <textarea
              value={form.clinical_notes}
              onChange={e => setForm({ ...form, clinical_notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Physical examination findings, clinical impression..."
            />
          </Accordion>

          {/* Ayurveda Assessment */}
          <Accordion title="Ayurveda Assessment" icon={<span className="text-base">🌿</span>}>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase text-slate-500">Prakriti & Vikriti</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Prakriti (Constitution)">
                  <select value={form.ayurveda.prakriti} onChange={e => setAyurveda('prakriti', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {DOSHA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Vikriti (Imbalance)">
                  <select value={form.ayurveda.vikriti} onChange={e => setAyurveda('vikriti', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {DOSHA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Dominant Dosha">
                  <select value={form.ayurveda.dosha} onChange={e => setAyurveda('dosha', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {DOSHA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              <p className="text-xs font-medium uppercase text-slate-500">Other Parameters</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Agni (Digestive Fire)">
                  <select value={form.ayurveda.agni} onChange={e => setAyurveda('agni', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {AGNI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Koshtha (Bowel Habit)">
                  <select value={form.ayurveda.koshtha} onChange={e => setAyurveda('koshtha', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {KOSHTHA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Satva (Mental Strength)">
                  <select value={form.ayurveda.satva} onChange={e => setAyurveda('satva', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {SATVA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Satmya (Adaptability)">
                  <select value={form.ayurveda.satmya} onChange={e => setAyurveda('satmya', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {SATMYA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Nidra (Sleep)">
                  <select value={form.ayurveda.nidra} onChange={e => setAyurveda('nidra', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {NIDRA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Nadi (Pulse)">
                  <select value={form.ayurveda.nadi} onChange={e => setAyurveda('nadi', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {DOSHA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Mala (Stool)">
                  <select value={form.ayurveda.mala} onChange={e => setAyurveda('mala', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {MALA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Mutra (Urine)">
                  <select value={form.ayurveda.mutra} onChange={e => setAyurveda('mutra', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {MUTRA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Jihva (Tongue)">
                  <select value={form.ayurveda.jihva} onChange={e => setAyurveda('jihva', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {JIHVA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </Accordion>

          {/* Ashtavidha Pariksha */}
          <Accordion title="Ashtavidha Pariksha (8-fold Examination)">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(ashtavidhaLabels).map(([key, label]) => (
                <Field key={key} label={label}>
                  <Input value={form.ayurveda.ashtavidha[key] || ''} onChange={e => setAshtavidha(key, e.target.value)} placeholder={label.split(' (')[0]} />
                </Field>
              ))}
            </div>
          </Accordion>

          {/* Dashavidha Pariksha */}
          <Accordion title="Dashavidha Pariksha (10-fold Examination)">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(dashavidhaLabels).map(([key, label]) => (
                <Field key={key} label={label}>
                  <Input value={form.ayurveda.dashavidha[key] || ''} onChange={e => setDashavidha(key, e.target.value)} placeholder={label.split(' (')[0]} />
                </Field>
              ))}
            </div>
          </Accordion>

          {/* Diagnosis */}
          <Accordion title="Diagnosis" icon={<FileText className="h-4 w-4 text-red-500" />}>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Input value={dx.diagnosis} onChange={e => setDx({ ...dx, diagnosis: e.target.value })} placeholder="Diagnosis name" />
              </div>
              <Input value={dx.icd_code} onChange={e => setDx({ ...dx, icd_code: e.target.value })} placeholder="ICD Code (optional)" />
              <select value={dx.diagnosis_type} onChange={e => setDx({ ...dx, diagnosis_type: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="PRIMARY">Primary</option>
                <option value="SECONDARY">Secondary</option>
                <option value="COMORBIDITY">Comorbidity</option>
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={dx.notes} onChange={e => setDx({ ...dx, notes: e.target.value })} placeholder="Notes" />
              <Button type="button" variant="secondary" onClick={addDiagnosis}>Add</Button>
            </div>
            {form.diagnoses.length > 0 && (
              <ul className="mt-3 space-y-1">
                {form.diagnoses.map((d, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-sm">
                    <span>
                      <Badge color={d.diagnosis_type === 'PRIMARY' ? 'purple' : d.diagnosis_type === 'SECONDARY' ? 'blue' : 'slate'}>{d.diagnosis_type}</Badge>{' '}
                      <span className="font-medium text-slate-700">{d.diagnosis}</span>
                      {d.icd_code && <span className="ml-2 font-mono text-xs text-slate-400">[{d.icd_code}]</span>}
                    </span>
                    <button type="button" onClick={() => removeDiagnosis(i)} className="text-sm text-red-500 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </Accordion>

          {/* Investigations */}
          <Accordion title="Investigations">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INVESTIGATION_OPTIONS.map(item => (
                <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={form.investigations.includes(item)} onChange={() => toggleInvestigation(item)} className="rounded text-emerald-600" />
                  {item}
                </label>
              ))}
            </div>
            <Input value={form.investigation_other} onChange={e => setForm({ ...form, investigation_other: e.target.value })} placeholder="Other investigation..." className="mt-2" />
          </Accordion>

          {/* Procedures */}
          <Accordion title="Procedures / Panchakarma">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROCEDURE_OPTIONS.map(item => (
                <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={form.procedures.includes(item)} onChange={() => toggleProcedure(item)} className="rounded text-emerald-600" />
                  {item}
                </label>
              ))}
            </div>
            <Input value={form.procedure_other} onChange={e => setForm({ ...form, procedure_other: e.target.value })} placeholder="Other procedure..." className="mt-2" />
          </Accordion>

          {/* Treatment Plan */}
          <Accordion title="Treatment Plan">
            <textarea
              value={form.treatment_plan}
              onChange={e => setForm({ ...form, treatment_plan: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Treatment approach, medications, procedures planned..."
            />
          </Accordion>

          {/* Diet Advice */}
          <Accordion title="Diet Advice (Pathya-Apathya)">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pathya (Recommended)">
                <textarea value={form.diet_pathya} onChange={e => setForm({ ...form, diet_pathya: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Warm water, fresh fruits, light meals..." />
              </Field>
              <Field label="Apathya (Avoid)">
                <textarea value={form.diet_apathya} onChange={e => setForm({ ...form, diet_apathya: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Cold drinks, spicy food, late nights..." />
              </Field>
            </div>
          </Accordion>

          {/* Follow-up */}
          <Accordion title="Follow-up">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Follow-up Date">
                <Input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
              </Field>
            </div>
          </Accordion>

          {/* Save */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">
              {existing ? 'Last saved: ' + new Date(existing.created_at).toLocaleString() : 'New consultation'}
            </div>
            <div className="flex gap-2">
              <Can permission="referral.create">
                <Link to="/admin/referrals">
                  <Button type="button" variant="secondary">
                    <ArrowLeftRight className="mr-1 h-4 w-4" /> Refer
                  </Button>
                </Link>
              </Can>
              <Can permission={existing ? 'consultation.update' : 'consultation.create'}>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : existing ? 'Update Consultation' : 'Save Consultation'}
                </Button>
              </Can>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
