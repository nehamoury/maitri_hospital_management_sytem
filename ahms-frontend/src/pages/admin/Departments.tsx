import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'
import { Search, FolderPlus, Trash2, Edit, Eye, X } from 'lucide-react'
import { cn } from '../../lib/utils'

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
    <div className="space-y-6">
      <PageHeader
        title="Departments Master"
        subtitle="Configure hospital specialty clinics, consultation pricing, and operational types."
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
              className="flex items-center gap-1.5 shadow-sm"
            >
              <FolderPlus className="h-4.5 w-4.5" />
              {showForm ? 'Cancel Editor' : 'Add Department'}
            </Button>
          </Can>
        }
      />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-6 max-w-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <CardHeader title={editingId ? 'Edit Department Record' : 'Create Hospital Department'} />
          <form onSubmit={save} className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Department Name *">
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="e.g. Panchakarma Therapy Unit" />
            </Field>
            <Field label="Department Code (Auto-generated)">
              <Input value={formCode} disabled className="bg-muted/50 cursor-not-allowed font-mono text-xs" />
            </Field>
            <Field label="Department Type *">
              <Select value={formType} onChange={(e) => setFormType(e.target.value)} required>
                {DEPARTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Default Consultation Fee (₹)" hint="Used if practitioner fee is not defined">
              <Input type="number" min={0} value={formFee} onChange={(e) => setFormFee(e.target.value)} placeholder="500.00" />
            </Field>
            {editingId && (
              <Field label="Operational Status">
                <Select
                  value={formIsActive ? 'true' : 'false'}
                  onChange={(e) => setFormIsActive(e.target.value === 'true')}
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">INACTIVE</option>
                </Select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Brief Description">
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="e.g. Traditional Ayurvedic detoxification treatments and therapies." />
              </Field>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-border mt-2 flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update Department' : 'Create Department'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter and Search controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20 border border-border p-4 rounded-2xl">
        <div className="w-full sm:max-w-sm relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department name, code, type..."
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl border border-border shrink-0">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
                statusFilter === status
                  ? 'bg-card text-foreground shadow border border-border'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Department List Table */}
      <Card>
        {!departments ? (
          <Spinner label="Loading departments inventory..." />
        ) : processedDepartments.length === 0 ? (
          <EmptyState message="No departments registered" />
        ) : (
          <Table headers={['Code', 'Name', 'Type', 'Practitioners Assigned', 'Default Fee', 'Status', '']}>
            {processedDepartments.map((d) => (
              <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                  <code>{d.code || '—'}</code>
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{d.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{d.type || '—'}</td>
                <td className="px-4 py-3 text-foreground font-mono font-bold text-xs">{d.doctorCount}</td>
                <td className="px-4 py-3 text-foreground font-mono font-bold text-xs">₹{(d.default_fee || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge color={d.is_active ? 'green' : 'red'}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => navigate(`/admin/departments/${d.id}`)} className="text-xs font-bold text-primary hover:underline cursor-pointer" title="View details">
                      <Eye className="h-4.5 w-4.5" />
                    </button>
                    <Can permission="department.update">
                      <button onClick={() => startEdit(d)} className="text-xs font-bold text-primary hover:underline cursor-pointer" title="Edit department">
                        <Edit className="h-4.5 w-4.5" />
                      </button>
                    </Can>
                    <Can permission="department.delete">
                      <button onClick={() => remove(d.id)} className="text-xs font-bold text-destructive hover:underline cursor-pointer" title="Delete department">
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
