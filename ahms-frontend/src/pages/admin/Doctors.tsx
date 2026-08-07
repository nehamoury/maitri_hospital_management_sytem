import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

interface Doctor {
  id: string
  full_name: string
  email: string
  mobile: string
  department_id: string
  department_name: string
  specialization: string
  qualification: string
  experience_years: number
  consultation_fee: number
  is_active: boolean
}

interface Department {
  id: string
  name: string
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    department_id: '',
    specialization: '',
    qualification: '',
    experience_years: '',
    consultation_fee: '',
    is_active: true
  })

  const load = () => {
    api
      .get<{ data: Doctor[] }>('/doctors')
      .then((res) => setDoctors(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load doctors')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Department[] }>('/departments').then((res) => setDepartments(res.data.data)).catch(() => {})
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (editingId) {
        // UpdateDoctorRequest payload
        await api.put(`/doctors/${editingId}`, {
          full_name: form.full_name,
          mobile: form.mobile,
          department_id: form.department_id,
          specialization: form.specialization,
          qualification: form.qualification,
          experience_years: Number(form.experience_years) || 0,
          consultation_fee: Number(form.consultation_fee) || 0,
          is_active: form.is_active
        })
      } else {
        // CreateDoctorRequest payload (requires password and email)
        await api.post('/doctors', {
          ...form,
          experience_years: Number(form.experience_years) || 0,
          consultation_fee: Number(form.consultation_fee) || 0,
        })
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ full_name: '', email: '', mobile: '', password: '', department_id: '', specialization: '', qualification: '', experience_years: '', consultation_fee: '', is_active: true })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save doctor details'))
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (d: Doctor) => {
    setEditingId(d.id)
    setForm({
      full_name: d.full_name,
      email: d.email,
      mobile: d.mobile,
      password: '', // Password is not editable in Update request
      department_id: d.department_id,
      specialization: d.specialization,
      qualification: d.qualification,
      experience_years: String(d.experience_years),
      consultation_fee: String(d.consultation_fee),
      is_active: d.is_active
    })
    setShowForm(true)
    setViewingDoc(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this doctor profile?')) return
    setError('')
    try {
      await api.delete(`/doctors/${id}`)
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete doctor. They may have existing appointments.'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Doctors"
        subtitle="Doctor profiles and departments"
        action={
          <Can permission="doctor.create">
            <Button 
              onClick={() => {
                if (showForm) {
                  setEditingId(null)
                  setForm({ full_name: '', email: '', mobile: '', password: '', department_id: '', specialization: '', qualification: '', experience_years: '', consultation_fee: '', is_active: true })
                }
                setShowForm((v) => !v)
                setViewingDoc(null)
              }}
            >
              {showForm ? 'Close' : '+ Add Doctor'}
            </Button>
          </Can>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {viewingDoc && (
        <Card className="mb-6 max-w-xl border-teal-100 bg-teal-50/5">
          <CardHeader 
            title="Doctor Details" 
            action={
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setViewingDoc(null)}>
                Close
              </Button>
            } 
          />
          <div className="p-6 space-y-4 text-sm text-slate-700">
            <p><strong>Name:</strong> {viewingDoc.full_name}</p>
            <p><strong>Email:</strong> {viewingDoc.email}</p>
            <p><strong>Mobile:</strong> {viewingDoc.mobile}</p>
            <p><strong>Department:</strong> {viewingDoc.department_name}</p>
            <p><strong>Specialization:</strong> {viewingDoc.specialization}</p>
            <p><strong>Qualification:</strong> {viewingDoc.qualification || '—'}</p>
            <p><strong>Experience:</strong> {viewingDoc.experience_years} years</p>
            <p><strong>Consultation Fee:</strong> ₹{viewingDoc.consultation_fee.toFixed(2)}</p>
            <p><strong>Status:</strong> <Badge color={viewingDoc.is_active ? 'green' : 'red'}>{viewingDoc.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge></p>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardHeader title={editingId ? 'Edit Doctor' : 'Add Doctor'} />
          <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Full Name *">
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </Field>
            {!editingId && (
              <>
                <Field label="Email *">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
                <Field label="Password *" hint="Minimum 8 characters — used for doctor login">
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </Field>
              </>
            )}
            <Field label="Mobile *">
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
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
            <Field label="Specialization *">
              <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required />
            </Field>
            <Field label="Qualification">
              <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="BAMS, MD (Kayachikitsa)" />
            </Field>
            <Field label="Experience (Years)">
              <Input type="number" min={0} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
            </Field>
            <Field label="Consultation Fee (₹)" hint="Leave as 0 to use the department's default fee">
              <Input type="number" min={0} value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} />
            </Field>
            {editingId && (
              <Field label="Status">
                <select
                  value={form.is_active ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring text-slate-800"
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">INACTIVE</option>
                </select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update Doctor' : 'Add Doctor'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {!doctors ? (
          <Spinner label="Loading doctors..." />
        ) : doctors.length === 0 ? (
          <EmptyState message="No doctors found" />
        ) : (
          <Table headers={['Name', 'Department', 'Specialization', 'Qualification', 'Exp', 'Fee', 'Status', 'Actions']}>
            {doctors.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {d.full_name}
                  <p className="text-xs text-slate-400">{d.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{d.department_name}</td>
                <td className="px-4 py-3 text-slate-600">{d.specialization}</td>
                <td className="px-4 py-3 text-slate-600">{d.qualification}</td>
                <td className="px-4 py-3 text-slate-600">{d.experience_years}y</td>
                <td className="px-4 py-3 text-slate-600">₹{d.consultation_fee.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge color={d.is_active ? 'green' : 'red'}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Button variant="ghost" className="px-3 py-1.5 text-xs font-semibold" onClick={() => setViewingDoc(d)}>
                    View
                  </Button>
                  <Can permission="doctor.update">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => startEdit(d)}>
                      Edit
                    </Button>
                  </Can>
                  <Can permission="doctor.delete">
                    <Button variant="danger" className="px-3 py-1.5 text-xs font-semibold" onClick={() => remove(d.id)}>
                      Delete
                    </Button>
                  </Can>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
