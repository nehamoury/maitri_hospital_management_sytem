import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'
import { Search, Trash2, Edit, Eye, X } from 'lucide-react'

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
  image_url: string
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
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [query])

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: { photo_url: string } }>('/upload/doctor-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm((prev) => ({ ...prev, image_url: res.data.data.photo_url }))
    } catch (err) {
      setError(errorMessage(err, 'Doctor image upload failed'))
    } finally {
      setUploading(false)
    }
  }
  
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
    image_url: '',
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

  const filteredDoctors = (doctors || []).filter((d) => {
    const term = query.toLowerCase()
    return (
      d.full_name.toLowerCase().includes(term) ||
      d.email.toLowerCase().includes(term) ||
      d.mobile.toLowerCase().includes(term) ||
      d.department_name.toLowerCase().includes(term) ||
      d.specialization.toLowerCase().includes(term)
    )
  })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (editingId) {
        await api.put(`/doctors/${editingId}`, {
          full_name: form.full_name,
          mobile: form.mobile,
          department_id: form.department_id,
          specialization: form.specialization,
          qualification: form.qualification,
          experience_years: Number(form.experience_years) || 0,
          consultation_fee: Number(form.consultation_fee) || 0,
          image_url: form.image_url,
          is_active: form.is_active
        })
      } else {
        await api.post('/doctors', {
          ...form,
          experience_years: Number(form.experience_years) || 0,
          consultation_fee: Number(form.consultation_fee) || 0,
        })
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ full_name: '', email: '', mobile: '', password: '', department_id: '', specialization: '', qualification: '', experience_years: '', consultation_fee: '', image_url: '', is_active: true })
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
      password: '',
      department_id: d.department_id,
      specialization: d.specialization,
      qualification: d.qualification,
      experience_years: String(d.experience_years),
      consultation_fee: String(d.consultation_fee),
      image_url: d.image_url || '',
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
    <div className="space-y-6">
      <PageHeader
        title="Doctors Master"
        subtitle="Manage hospital practitioners, specializations, login credentials, and fees."
        action={
          <Can permission="doctor.create">
            <Button 
              onClick={() => {
                if (showForm) {
                  setEditingId(null)
                  setForm({ full_name: '', email: '', mobile: '', password: '', department_id: '', specialization: '', qualification: '', experience_years: '', consultation_fee: '', image_url: '', is_active: true })
                }
                setShowForm((v) => !v)
                setViewingDoc(null)
              }}
            >
              {showForm ? 'Close Editor' : '+ Add Doctor'}
            </Button>
          </Can>
        }
      />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {viewingDoc && (
        <Card className="mb-6 max-w-xl animate-in fade-in slide-in-from-top-2 duration-150 border-primary/20">
          <CardHeader 
            title="Practitioner Profile" 
            action={
              <Button variant="ghost" onClick={() => setViewingDoc(null)}>
                Close Details
              </Button>
            } 
          />
          <div className="p-6 space-y-4 text-sm text-foreground">
            <div className="flex items-center gap-4 py-2 border-b border-border">
              {viewingDoc.image_url ? (
                <img
                  src={viewingDoc.image_url}
                  alt={viewingDoc.full_name}
                  className="h-16 w-16 rounded-full object-cover border border-border ring-2 ring-primary/10 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
                  {viewingDoc.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase() || 'DR'}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Profile Avatar</p>
                <p className="text-xs break-all font-mono text-muted-foreground mt-0.5">{viewingDoc.image_url || 'Default System Initials'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</p>
                <p className="font-semibold text-foreground mt-0.5">{viewingDoc.full_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Specialization</p>
                <p className="font-semibold text-foreground mt-0.5">{viewingDoc.specialization}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Qualification</p>
                <p className="font-semibold text-foreground mt-0.5">{viewingDoc.qualification || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Experience</p>
                <p className="font-semibold text-foreground mt-0.5">{viewingDoc.experience_years} Years</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Department</p>
                <p className="font-semibold text-foreground mt-0.5">{viewingDoc.department_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Consultation Fee</p>
                <p className="font-semibold text-foreground mt-0.5 font-mono">₹{viewingDoc.consultation_fee.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mobile Number</p>
                <p className="font-semibold text-foreground mt-0.5">{viewingDoc.mobile}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</p>
                <p className="font-semibold text-foreground mt-0.5">{viewingDoc.email}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6 max-w-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <CardHeader title={editingId ? 'Edit Doctor Profile' : 'Register New Doctor'} />
          <form onSubmit={save} className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Full Name *">
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </Field>
            {!editingId && (
              <>
                <Field label="Email Address *">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
                <Field label="Login Password *" hint="Minimum 8 characters — used for portal login">
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </Field>
              </>
            )}
            <Field label="Mobile Number *">
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
            <Field label="Consultation Fee (₹)" hint="Leave 0 to inherit department default">
              <Input type="number" min={0} value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} />
            </Field>
            {editingId && (
              <Field label="Practitioner Status">
                <Select
                  value={form.is_active ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">INACTIVE</option>
                </Select>
              </Field>
            )}
            
            <div className="sm:col-span-2 grid sm:grid-cols-3 gap-6 items-center bg-muted/20 p-4 rounded-xl border border-border">
              <div className="sm:col-span-2 space-y-4">
                <Field label="Upload Doctor Profile Photo" hint="Choose an image file (max 2MB)">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadPhoto(file)
                    }}
                    className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/70 cursor-pointer"
                  />
                  {uploading && <p className="text-xs text-primary animate-pulse">Uploading photo...</p>}
                </Field>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink mx-4 text-xs font-semibold text-muted-foreground">OR</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>
                <Field label="Image URL Source" hint="Paste direct web avatar link">
                  <Input 
                    type="text" 
                    value={form.image_url} 
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })} 
                    placeholder="https://example.com/avatar.jpg"
                  />
                </Field>
              </div>
              <div className="flex flex-col items-center justify-center pt-2">
                <span className="text-xs font-semibold text-muted-foreground mb-2">Live Avatar</span>
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-20 w-20 rounded-full object-cover border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                    {form.full_name ? form.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase() : 'DR'}
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-border mt-2 flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update Profile' : 'Register Doctor'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <Input
              placeholder="Search doctors by name, email, mobile, department, specialization..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {!doctors ? (
          <Spinner label="Loading practitioner registry..." />
        ) : filteredDoctors.length === 0 ? (
          <EmptyState message="No doctors found matching queries" />
        ) : (
          <>
            <Table headers={['Doctor Profile', 'Department', 'Specialization', 'Qualification', 'Exp', 'Consult Fee', 'Status', '']}>
              {filteredDoctors.slice((page - 1) * 10, page * 10).map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {d.image_url ? (
                        <img
                          src={d.image_url}
                          alt={d.full_name}
                          className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shrink-0">
                          {d.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase() || 'DR'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground">{d.full_name}</div>
                        <p className="text-[11px] text-muted-foreground font-normal">{d.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{d.department_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{d.specialization}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-semibold">{d.qualification}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{d.experience_years}y</td>
                  <td className="px-4 py-3 text-foreground font-mono font-bold text-xs">₹{d.consultation_fee.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge color={d.is_active ? 'green' : 'red'}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setViewingDoc(d)} className="text-xs font-bold text-primary hover:underline cursor-pointer" title="View details">
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                      <Can permission="doctor.update">
                        <button onClick={() => startEdit(d)} className="text-xs font-bold text-primary hover:underline cursor-pointer" title="Edit doctor">
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                      </Can>
                      <Can permission="doctor.delete">
                        <button onClick={() => remove(d.id)} className="text-xs font-bold text-destructive hover:underline cursor-pointer" title="Delete doctor">
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/10">
              <span className="text-xs text-muted-foreground font-medium">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, filteredDoctors.length)} of {filteredDoctors.length} doctors
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="secondary" onClick={() => setPage(p => Math.min(Math.ceil(filteredDoctors.length / 10), p + 1))} disabled={page === Math.ceil(filteredDoctors.length / 10)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
