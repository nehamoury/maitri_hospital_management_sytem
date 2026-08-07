import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Field } from '../../components/ui'
import Dispensing from './Dispensing'

interface Medicine {
  id: string
  name: string
  formulation: string
  unit: string
  batch_number: string
  expiry_date: string
  stock_qty: number
  low_stock_threshold: number
  is_active: boolean
  low_stock: boolean
  is_expired: boolean
  near_expiry: boolean
}

export default function Pharmacy() {
  const [tab, setTab] = useState<'inventory' | 'dispensing'>('inventory')
  const [medicines, setMedicines] = useState<Medicine[] | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'near' | 'expired'>('all')
  const [form, setForm] = useState({ name: '', formulation: '', unit: '', batch_number: '', expiry_date: '', stock_qty: '', low_stock_threshold: '' })
  const [stockFor, setStockFor] = useState<Medicine | null>(null)
  const [stockForm, setStockForm] = useState({ quantity: '', batch_number: '', notes: '' })

  const load = () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (filter === 'low') params.low_stock = 'true'
    if (filter === 'near') params.near_expiry = 'true'
    if (filter === 'expired') params.expired = 'true'
    api
      .get<{ data: Medicine[] }>('/medicines', { params })
      .then((res) => setMedicines(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load medicines')))
  }

  useEffect(load, [search, filter])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/medicines', {
        name: form.name,
        formulation: form.formulation,
        unit: form.unit,
        batch_number: form.batch_number,
        expiry_date: form.expiry_date || undefined,
        stock_qty: Number(form.stock_qty) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
      })
      setShowForm(false)
      setForm({ name: '', formulation: '', unit: '', batch_number: '', expiry_date: '', stock_qty: '', low_stock_threshold: '' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to create medicine'))
    } finally {
      setLoading(false)
    }
  }

  const adjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockFor) return
    setLoading(true)
    setError('')
    try {
      await api.post(`/medicines/${stockFor.id}/stock`, {
        quantity: Number(stockForm.quantity),
        batch_number: stockForm.batch_number,
        notes: stockForm.notes,
      })
      setStockFor(null)
      setStockForm({ quantity: '', batch_number: '', notes: '' })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to adjust stock'))
    } finally {
      setLoading(false)
    }
  }

  const expiryBadge = (m: Medicine) => {
    if (m.is_expired) return <Badge color="red">EXPIRED</Badge>
    if (m.near_expiry) return <Badge color="amber">NEAR EXPIRY</Badge>
    return null
  }

  const filters = [
    { key: 'all' as const, label: 'All' },
    { key: 'low' as const, label: 'Low Stock' },
    { key: 'near' as const, label: 'Near Expiry' },
    { key: 'expired' as const, label: 'Expired' },
  ]

  return (
    <div>
      <PageHeader
        title="Pharmacy"
        subtitle="Medicines, batch tracking and inventory management"
        action={
          <div className="flex gap-2">
            <Can permission="pharmacy.dispense">
              <div className="mr-2 flex gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setTab('inventory')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === 'inventory' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Inventory
                </button>
                <button
                  onClick={() => setTab('dispensing')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === 'dispensing' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Dispensing
                </button>
              </div>
            </Can>
            <Can permission="pharmacy.stock">
              <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ Add Medicine'}</Button>
            </Can>
          </div>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {tab === 'dispensing' && (
        <Can permission="pharmacy.dispense">
          <div className="mb-6">
            <Dispensing />
          </div>
        </Can>
      )}

      {tab === 'inventory' && (
        <>
          {showForm && (
            <Card className="mb-6 max-w-2xl">
          <CardHeader title="Add Medicine" />
          <form onSubmit={create} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Name *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Formulation">
              <Input value={form.formulation} onChange={(e) => setForm({ ...form, formulation: e.target.value })} placeholder="Churna / Vati / Kwath" />
            </Field>
            <Field label="Unit">
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="g / kg / tablet" />
            </Field>
            <Field label="Batch Number">
              <Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} placeholder="e.g. BT-2026-001" />
            </Field>
            <Field label="Expiry Date">
              <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </Field>
            <Field label="Opening Stock">
              <Input type="number" min={0} value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            </Field>
            <Field label="Low Stock Threshold">
              <Input type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Add Medicine'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {stockFor && (
        <Card className="mb-6 max-w-2xl">
          <CardHeader title={`Adjust Stock: ${stockFor.name}`} action={<Badge color={stockFor.low_stock ? 'red' : 'green'}>Current: {stockFor.stock_qty}</Badge>} />
          <form onSubmit={adjustStock} className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Quantity *">
              <Input type="number" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} required placeholder="+100 or -10" />
            </Field>
            <Field label="Batch Number">
              <Input value={stockForm.batch_number} onChange={(e) => setStockForm({ ...stockForm, batch_number: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Notes">
              <Input value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} />
            </Field>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Adjusting...' : 'Adjust Stock'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStockFor(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <Input placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {!medicines ? (
          <Spinner label="Loading medicines..." />
        ) : medicines.length === 0 ? (
          <EmptyState message="No medicines found" />
        ) : (
          <div className="overflow-x-auto">
            <Table headers={['Name', 'Formulation', 'Batch', 'Expiry', 'Stock', 'Status', 'Actions']}>
              {medicines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600">{m.formulation}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.batch_number || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    {m.expiry_date ? (
                      <span className={m.is_expired ? 'text-red-600' : m.near_expiry ? 'text-amber-600' : 'text-slate-600'}>
                        {m.expiry_date}
                      </span>
                    ) : '—'}
                    <span className="ml-1">{expiryBadge(m)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={m.low_stock ? 'font-medium text-red-600' : 'text-slate-700'}>
                      {m.stock_qty} {m.unit}
                    </span>
                    {m.low_stock && <span className="ml-2 text-xs text-red-500">LOW</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={m.is_active ? 'green' : 'red'}>{m.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Can permission="pharmacy.stock">
                      <button onClick={() => setStockFor(m)} className="text-sm text-emerald-700 hover:underline">
                        Adjust Stock
                      </button>
                    </Can>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
        </>
      )}
    </div>
  )
}
