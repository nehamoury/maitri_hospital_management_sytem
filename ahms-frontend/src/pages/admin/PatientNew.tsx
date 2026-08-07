import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Card, CardHeader, Button, Input, Select, Textarea, Field, PageHeader } from '../../components/ui'

interface ExistingPatient {
  id: string
  uhid: string
  full_name: string
  gender: string
  mobile: string
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function PatientNew() {
  const navigate = useNavigate()
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
    force: false,
  })
  const [error, setError] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [duplicates, setDuplicates] = useState<ExistingPatient[]>([])
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const onDobChange = (dob: string) => {
    setForm((f) => ({ ...f, dob, age: dob ? calcAge(dob) : f.age }))
  }

  const calcAge = (dob: string) => {
    const b = new Date(dob)
    const now = new Date()
    let years = now.getFullYear() - b.getFullYear()
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) years--
    return years >= 0 ? String(years) : ''
  }

  const bmi = () => {
    const h = Number(form.height_cm)
    const w = Number(form.weight_kg)
    if (h > 0 && w > 0) return (w / Math.pow(h / 100, 2)).toFixed(1)
    return ''
  }

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: { photo_url: string } }>('/upload/patient-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      set('photo_url', res.data.data.photo_url)
    } catch (err) {
      setError(errorMessage(err, 'Photo upload failed'))
    } finally {
      setPhotoUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setDuplicates([])
    setLoading(true)
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : 0,
        height_cm: form.height_cm ? Number(form.height_cm) : 0,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : 0,
        force: form.force,
      }
      const res = await api.post<{ data: { id: string } }>('/patients', payload)
      navigate(`/admin/patients/${res.data.data.id}`)
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string; existing_patients?: ExistingPatient[] } } }
      setError(errorMessage(err, 'Registration failed'))
      if (axiosErr.response?.data?.existing_patients) {
        setDuplicates(axiosErr.response.data.existing_patients)
      }
    } finally {
      setLoading(false)
    }
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-bold uppercase tracking-wide text-teal-800">{children}</h3>
  )

  const Divider = () => <div className="border-t border-slate-100 pt-4" />

  return (
    <div className="max-w-4xl">
      <PageHeader title="Register Patient" subtitle="New patient registration with UHID generation" />
      <Card>
        <CardHeader title="Patient Details" />
        <form onSubmit={submit} className="space-y-6 p-5">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {duplicates.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Possible duplicate found. Force registration if this is a new patient.
              <ul className="mt-1 list-inside list-disc">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    {d.full_name} ({d.uhid}) — {d.mobile}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 1. Basic Information */}
          <section className="space-y-4">
            <SectionTitle>Basic Information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="UHID" hint="Auto-generated on save">
                <Input value="AHMS-YYYY-NNNNNN" disabled />
              </Field>
              <Field label="Photo">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-teal-500 hover:text-teal-700">
                    {photoUploading ? 'Uploading...' : form.photo_url ? 'Change photo' : 'Upload photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadPhoto(f)
                      }}
                    />
                  </label>
                  {form.photo_url && <img src={form.photo_url} alt="patient" className="h-14 w-14 rounded-xl object-cover ring-2 ring-teal-100" />}
                </div>
              </Field>
              <Field label="Full Name *">
                <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
              </Field>
              <Field label="Gender *">
                <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Field label="Date of Birth">
                <Input type="date" value={form.dob} onChange={(e) => onDobChange(e.target.value)} />
              </Field>
              <Field label="Age" hint="Auto-calculated from DOB">
                <Input type="number" min={0} max={150} value={form.age} onChange={(e) => set('age', e.target.value)} />
              </Field>
              <Field label="Mobile *">
                <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} required />
              </Field>
              <Field label="Alternate Mobile">
                <Input value={form.alternate_mobile} onChange={(e) => set('alternate_mobile', e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Blood Group">
                <Select value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Marital Status">
                <Select value={form.marital_status} onChange={(e) => set('marital_status', e.target.value)}>
                  <option value="">Select</option>
                  <option value="MARRIED">Married</option>
                  <option value="UNMARRIED">Unmarried</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </Select>
              </Field>
              <Field label="Occupation">
                <Input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* 2. Address */}
          <Divider />
          <section className="space-y-4">
            <SectionTitle>Address</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Address Line">
                  <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} />
                </Field>
              </div>
              <Field label="City *">
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} required />
              </Field>
              <Field label="State *">
                <Input value={form.state} onChange={(e) => set('state', e.target.value)} required />
              </Field>
              <Field label="District">
                <Input value={form.district} onChange={(e) => set('district', e.target.value)} />
              </Field>
              <Field label="Pincode *">
                <Input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} required />
              </Field>
              <Field label="Country *">
                <Input value={form.country} onChange={(e) => set('country', e.target.value)} required />
              </Field>
            </div>
          </section>

          {/* 3. Emergency Contact */}
          <Divider />
          <section className="space-y-4">
            <SectionTitle>Emergency Contact</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact Person Name *">
                <Input value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} required />
              </Field>
              <Field label="Relation *">
                <Input value={form.emergency_contact_relation} onChange={(e) => set('emergency_contact_relation', e.target.value)} required />
              </Field>
              <Field label="Mobile Number *">
                <Input value={form.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)} required />
              </Field>
              <Field label="Address">
                <Input value={form.emergency_contact_address} onChange={(e) => set('emergency_contact_address', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* 4. Medical Information */}
          <Divider />
          <section className="space-y-4">
            <SectionTitle>Medical Information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Height (cm)">
                <Input type="number" min={30} max={250} value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} />
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" min={1} max={300} value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
              </Field>
              <Field label="BMI" hint="Auto-calculated">
                <Input value={bmi()} disabled />
              </Field>
              <Field label="Blood Pressure">
                <Input value={form.blood_pressure} onChange={(e) => set('blood_pressure', e.target.value)} placeholder="e.g. 120/80" />
              </Field>
              <Field label="Pulse">
                <Input value={form.pulse} onChange={(e) => set('pulse', e.target.value)} placeholder="e.g. 72 bpm" />
              </Field>
              <Field label="Sugar">
                <Input value={form.sugar} onChange={(e) => set('sugar', e.target.value)} placeholder="e.g. Fasting 90" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Allergies">
                  <Textarea value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g. Penicillin, Dust" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Chronic Diseases">
                  <Textarea value={form.chronic_diseases} onChange={(e) => set('chronic_diseases', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Current Medication">
                  <Textarea value={form.current_medication} onChange={(e) => set('current_medication', e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          {/* 5. Registration Details */}
          <Divider />
          <section className="space-y-4">
            <SectionTitle>Registration Details</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registration Type *">
                <Select value={form.registration_type} onChange={(e) => set('registration_type', e.target.value)}>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="ONLINE">Online</option>
                  <option value="REFERRAL">Referral</option>
                </Select>
              </Field>
              <Field label="Referred By">
                <Input value={form.referred_by} onChange={(e) => set('referred_by', e.target.value)} placeholder="Doctor / hospital name" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Remarks">
                  <Textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.force} onChange={(e) => set('force', e.target.checked)} />
            Force register (bypass duplicate check)
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading || photoUploading}>
              {loading ? 'Registering...' : 'Register Patient'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/patients')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
