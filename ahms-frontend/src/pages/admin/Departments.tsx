import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

interface Department {
  id: string
  code: string
  name: string
  type: string
  description: string
  default_fee: number
  is_active: boolean
  created_at: string
}

interface Doctor {
  id: string
  full_name: string
  department_id: string
}

// Department types come from the backend's Department Master allow-list.
const DEPARTMENT_TYPES = ['OPD', 'Procedure', 'Wellness', 'Clinical', 'Pharmacy', 'Emergency']

export default function Departments() {
  const [departments, setDepartments] = useState<Department[] | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState('OPD')
  const [formFee, setFormFee] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  const load = () => {
    api
      .get<{ data: Department[] }>('/departments')
      .then((res) => setDepartments(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load departments')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Doctor[] }>('/doctors').then((res) => setDoctors(res.data.data || [])).catch(() => {})
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: formName,
        code: formCode,
        type: formType,
        description: formDescription,
        default_fee: Number(formFee || 0),
      }

      if (editingId) {
        await api.put(`/departments/${editingId}`, { ...payload, is_active: formIsActive })
      } else {
        await api.post('/departments', payload)
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save department'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormCode('')
    setFormType('OPD')
    setFormFee('')
    setFormDescription('')
    setFormIsActive(true)
  }

  const startEdit = (d: Department) => {
    setEditingId(d.id)
    setFormName(d.name)
    setFormCode(d.code || '')
    setFormType(d.type || 'OPD')
    setFormFee(d.default_fee ? String(d.default_fee) : '')
    setFormDescription(d.description || '')
    setFormIsActive(d.is_active)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return
    setError('')
    try {
      await api.delete(`/departments/${id}`)
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete department. It may be linked to existing doctors.'))
    }
  }

  // Derived calculations: map and filter departments list
  const processedDepartments = useMemo(() => {
    if (!departments) return []
    return departments.map((d) => {
      const assignedDocs = doctors.filter(doc => doc.department_id === d.id)
      return {
        ...d,
        doctorCount: assignedDocs.length,
      }
    }).filter(d => {
      const matchSearch = searchQuery === '' ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.type.toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && d.is_active) ||
        (statusFilter === 'INACTIVE' && !d.is_active)

      return matchSearch && matchStatus
    })
  }, [departments, doctors, searchQuery, statusFilter])

  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Department Master — clinical departments of the hospital"
        action={
          <Can permission="department.create">
            <Button
              onClick={() => {
                if (showForm) {
                  setEditingId(null)
                  resetForm()
                } else {
                  setEditingId(null)
                  resetForm()
                  const nextNum = (departments?.length || 0) + 1
                  setFormCode(`DEP-${String(nextNum).padStart(3, '0')}`)
                }
                setShowForm((v) => !v)
              }}
            >
              {showForm ? 'Close' : '+ Add Department'}
            </Button>
          </Can>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Add / Edit Form Card */}
      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardHeader title={editingId ? 'Edit Department' : 'Add Department'} />
          <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Department Name *">
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="e.g. Panchakarma" />
            </Field>
            <Field label="Department Code (Auto-generated)">
              <Input value={formCode} readOnly className="bg-slate-50 cursor-not-allowed text-slate-500" />
            </Field>
            <Field label="Department Type *">
              <Select value={formType} onChange={(e) => setFormType(e.target.value)} required>
                {DEPARTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Default Consultation Fee (₹)" hint="Base fee used if doctor doesn't have a specific fee">
              <Input type="number" min={0} value={formFee} onChange={(e) => setFormFee(e.target.value)} placeholder="e.g. 500" />
            </Field>
            {editingId && (
              <Field label="Status">
                <select
                  value={formIsActive ? 'true' : 'false'}
                  onChange={(e) => setFormIsActive(e.target.value === 'true')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring text-slate-800"
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">INACTIVE</option>
                </select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Description">
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description of clinical functions" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update Department' : 'Add Department'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter and Search controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code or type..."
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === status
                  ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Department List Table */}
      <Card>
        {!departments ? (
          <Spinner label="Loading departments..." />
        ) : processedDepartments.length === 0 ? (
          <EmptyState message="No departments found" />
        ) : (
          <Table headers={['Code', 'Name', 'Type', 'Doctors', 'Fee', 'Status', 'Actions']}>
            {processedDepartments.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-teal-700">
                  <code>{d.code || '—'}</code>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{d.type || '—'}</td>
                <td className="px-4 py-3 text-slate-600 font-semibold">{d.doctorCount}</td>
                <td className="px-4 py-3 text-slate-600">₹{d.default_fee || 0}</td>
                <td className="px-4 py-3">
                  <Badge color={d.is_active ? 'green' : 'red'}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Button variant="ghost" className="px-3 py-1.5 text-xs font-semibold" onClick={() => navigate(`/admin/departments/${d.id}`)}>
                    View
                  </Button>
                  <Can permission="department.update">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => startEdit(d)}>
                      Edit
                    </Button>
                  </Can>
                  <Can permission="department.delete">
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
