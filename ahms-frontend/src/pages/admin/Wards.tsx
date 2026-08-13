import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

interface Ward {
  id: string
  code: string
  name: string
  location: string
  department_id?: string
  department_name?: string
  is_active: boolean
  total_beds: number
  available_beds: number
  occupied_beds: number
  reserved_beds: number
  maintenance_beds: number
  beds?: Bed[]
}

interface Bed {
  id: string
  ward_id: string
  ward_name?: string
  bed_no: string
  bed_type: string
  status: string
  is_active: boolean
}

interface Department {
  id: string
  name: string
  code?: string
}

const BED_TYPES = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU']
const BED_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']

const statusColor = (s: string) =>
  s === 'AVAILABLE' ? 'green' : s === 'OCCUPIED' ? 'blue' : s === 'RESERVED' ? 'amber' : s === 'MAINTENANCE' ? 'red' : 'slate'

export default function Wards() {
  const [wards, setWards] = useState<Ward[] | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showWardForm, setShowWardForm] = useState(false)
  const [showBedForm, setShowBedForm] = useState(false)
  const [editWard, setEditWard] = useState<Ward | null>(null)
  const [editBed, setEditBed] = useState<Bed | null>(null)
  const [wardForm, setWardForm] = useState({ code: '', name: '', location: '', department_id: '', is_active: true })
  const [bedForm, setBedForm] = useState({ ward_id: '', bed_no: '', bed_type: 'GENERAL', status: 'AVAILABLE', is_active: true })

  const load = () => {
    api
      .get<{ data: Ward[] }>('/wards')
      .then((res) => setWards(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load wards')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Department[] }>('/departments').then((res) => setDepartments(res.data.data)).catch(() => {})
  }, [])

  const saveWard = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...wardForm, department_id: wardForm.department_id || undefined }
      if (editWard) await api.put(`/wards/${editWard.id}`, payload)
      else await api.post('/wards', payload)
      setShowWardForm(false)
      setEditWard(null)
      setWardForm({ code: '', name: '', location: '', department_id: '', is_active: true })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save ward'))
    } finally {
      setLoading(false)
    }
  }

  const saveBed = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...bedForm, is_active: bedForm.is_active }
      if (editBed) await api.put(`/beds/${editBed.id}`, payload)
      else await api.post('/beds', payload)
      setShowBedForm(false)
      setEditBed(null)
      setBedForm({ ward_id: '', bed_no: '', bed_type: 'GENERAL', status: 'AVAILABLE', is_active: true })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save bed'))
    } finally {
      setLoading(false)
    }
  }

  const setBedStatus = async (b: Bed, status: string) => {
    setError('')
    try {
      await api.put(`/beds/${b.id}/status`, { status })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update bed status'))
    }
  }

  const openEditWard = (w: Ward) => {
    setEditWard(w)
    setWardForm({ code: w.code, name: w.name, location: w.location || '', department_id: w.department_id || '', is_active: w.is_active })
    setShowWardForm(true)
  }

  const openEditBed = (b: Bed) => {
    setEditBed(b)
    setBedForm({ ward_id: b.ward_id, bed_no: b.bed_no, bed_type: b.bed_type, status: b.status, is_active: b.is_active })
    setShowBedForm(true)
  }

  const totalBeds = wards?.reduce((s, w) => s + w.total_beds, 0) ?? 0
  const occupiedBeds = wards?.reduce((s, w) => s + w.occupied_beds, 0) ?? 0
  const availableBeds = wards?.reduce((s, w) => s + w.available_beds, 0) ?? 0

  return (
    <div>
      <PageHeader
        title="IPD Wards & Beds"
        subtitle="Ward master, bed allocation and occupancy"
        action={
          <div className="flex gap-3">
            <Can permission="ward.manage">
              <Button onClick={() => { setEditBed(null); setBedForm({ ward_id: bedForm.ward_id || wards?.[0]?.id || '', bed_no: '', bed_type: 'GENERAL', status: 'AVAILABLE', is_active: true }); setShowBedForm((v) => !v) }}>
                {showBedForm ? 'Close' : '+ Add Bed'}
              </Button>
            </Can>
            <Can permission="ward.manage">
              <Button onClick={() => { setEditWard(null); setWardForm({ code: '', name: '', location: '', department_id: '', is_active: true }); setShowWardForm((v) => !v) }}>
                {showWardForm ? 'Close' : '+ Add Ward'}
              </Button>
            </Can>
          </div>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showWardForm && (
        <Card className="mb-6">
          <CardHeader title={editWard ? `Edit Ward ${editWard.code}` : 'New Ward'} />
          <form onSubmit={saveWard} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Code *">
              <Input value={wardForm.code} onChange={(e) => setWardForm({ ...wardForm, code: e.target.value })} required placeholder="e.g. GENMED" />
            </Field>
            <Field label="Name *">
              <Input value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} required placeholder="e.g. General Medicine Ward" />
            </Field>
            <Field label="Location">
              <Input value={wardForm.location} onChange={(e) => setWardForm({ ...wardForm, location: e.target.value })} placeholder="e.g. Ground Floor, Block B" />
            </Field>
            <Field label="Department">
              <Select value={wardForm.department_id} onChange={(e) => setWardForm({ ...wardForm, department_id: e.target.value })}>
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Ward'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowWardForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {showBedForm && (
        <Card className="mb-6">
          <CardHeader title={editBed ? `Edit Bed ${editBed.bed_no}` : 'New Bed'} />
          <form onSubmit={saveBed} className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Ward *">
              <Select value={bedForm.ward_id} onChange={(e) => setBedForm({ ...bedForm, ward_id: e.target.value })} required>
                <option value="">Select ward</option>
                {(wards ?? []).map((w) => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Bed No *">
              <Input value={bedForm.bed_no} onChange={(e) => setBedForm({ ...bedForm, bed_no: e.target.value })} required placeholder="e.g. 101" />
            </Field>
            <Field label="Bed Type">
              <Select value={bedForm.bed_type} onChange={(e) => setBedForm({ ...bedForm, bed_type: e.target.value })}>
                {BED_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={bedForm.status} onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}>
                {BED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-3 flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Bed'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowBedForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {!wards ? (
        <Spinner label="Loading wards..." />
      ) : wards.length === 0 ? (
        <Card><EmptyState message="No wards yet — add your first ward and beds" /></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Beds</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalBeds}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Available</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{availableBeds}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Occupied</p>
              <p className="mt-1 text-3xl font-bold text-blue-700">{occupiedBeds}</p>
            </Card>
          </div>

          {wards.map((w) => (
            <Card key={w.id}>
              <CardHeader
                title={`${w.code} — ${w.name}`}
                subtitle={`${w.location || 'No location'}${w.department_name ? ` • ${w.department_name}` : ''} • ${w.total_beds} beds (${w.available_beds} avail)`}
                action={
                  <div className="flex items-center gap-2">
                    <Can permission="ward.manage">
                      <Button variant="secondary" onClick={() => openEditWard(w)}>Edit</Button>
                    </Can>
                  </div>
                }
              />
              <div className="p-5">
                <div className="mb-4 flex flex-wrap gap-2 text-sm">
                  <Badge color="green">{w.available_beds} Available</Badge>
                  <Badge color="blue">{w.occupied_beds} Occupied</Badge>
                  <Badge color="amber">{w.reserved_beds} Reserved</Badge>
                  <Badge color="red">{w.maintenance_beds} Maintenance</Badge>
                </div>
                {!w.beds || w.beds.length === 0 ? (
                  <EmptyState message="No beds in this ward yet" />
                ) : (
                  <Table headers={['Bed No', 'Type', 'Status', 'Actions']}>
                    {w.beds.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-sm text-slate-800">{b.bed_no}</td>
                        <td className="px-4 py-3 text-slate-600">{b.bed_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">
                          <Badge color={statusColor(b.status)}>{b.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Can permission="ward.manage">
                            <div className="flex items-center gap-3 text-sm">
                              <Select
                                value={b.status}
                                onChange={(e) => setBedStatus(b, e.target.value)}
                                className="w-40"
                              >
                                {BED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </Select>
                              <button onClick={() => openEditBed(b)} className="text-emerald-700 hover:underline">Edit</button>
                            </div>
                          </Can>
                        </td>
                      </tr>
                    ))}
                  </Table>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
