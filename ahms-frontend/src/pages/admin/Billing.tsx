import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

interface Bill {
  id: string
  bill_no: string
  patient_id: string
  patient_name: string
  total_amount: number
  discount: number
  net_amount: number
  paid_amount: number
  due_amount: number
  payment_status: string
  billed_by: string
  created_at: string
  items?: BillItem[]
}

interface Patient {
  id: string
  full_name: string
  uhid: string
}

interface BillItem {
  description: string
  quantity: number
  rate: number
  service_type: string
}

const statusColor = (s: string) =>
  s === 'PAID' ? 'green' : s === 'PARTIAL' ? 'amber' : s === 'UNPAID' ? 'red' : 'slate'

export default function Billing() {
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Bill | null>(null)
  const [payAmt, setPayAmt] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payRef, setPayRef] = useState('')
  const [form, setForm] = useState({
    patient_id: '',
    discount: '',
    items: [] as BillItem[],
  })
  const [line, setLine] = useState<BillItem>({ description: '', quantity: 1, rate: 0, service_type: '' })

  const load = () => {
    api
      .get<{ data: Bill[] }>('/bills')
      .then((res) => setBills(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load bills')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Patient[] }>('/patients').then((res) => setPatients(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (expanded) {
      setPayAmt(expanded.due_amount.toString())
    } else {
      setPayAmt('')
    }
  }, [expanded])

  const addLine = () => {
    if (!line.description.trim()) return
    setForm((f) => ({ ...f, items: [...f.items, { ...line, quantity: Number(line.quantity) || 1, rate: Number(line.rate) || 0 }] }))
    setLine({ description: '', quantity: 1, rate: 0, service_type: '' })
  }

  const removeLine = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post<{ data: Bill }>('/bills', {
        patient_id: form.patient_id,
        discount: Number(form.discount) || 0,
        items: form.items,
      })
      setShowForm(false)
      setForm({ patient_id: '', discount: '', items: [] })
      load()
      setExpanded(res.data.data)
    } catch (err) {
      setError(errorMessage(err, 'Failed to create bill'))
    } finally {
      setLoading(false)
    }
  }

  const pay = async (billId: string) => {
    setLoading(true)
    setError('')
    try {
      await api.post(`/bills/${billId}/payments`, {
        amount: Number(payAmt),
        method: payMethod,
        reference: payRef || undefined,
      })
      setPayAmt('')
      setPayRef('')
      load()
      const updated = bills?.find((b) => b.id === billId)
      if (updated) setExpanded({ ...updated })
    } catch (err) {
      setError(errorMessage(err, 'Failed to record payment'))
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) => `₹${n.toFixed(2)}`

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Bills and payments"
        action={
          <Can permission="billing.create">
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ Create Bill'}</Button>
          </Can>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="Create Bill" />
          <form onSubmit={create} className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Patient *">
                <Select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.uhid})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Discount (₹)">
                <Input type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0.00" />
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/20 p-5">
              <p className="mb-4 text-sm font-semibold text-slate-800">Add Bill Items (Consultation, Medicine, Therapies)</p>
              <div className="grid gap-3 items-end sm:grid-cols-5">
                <div className="sm:col-span-2">
                  <Field label="Item / Service Description">
                    <Input value={line.description} onChange={(e) => setLine({ ...line, description: e.target.value })} placeholder="e.g. Consultation Fee, Ashwagandha..." />
                  </Field>
                </div>
                <Field label="Qty">
                  <Input type="number" min={1} value={line.quantity} onChange={(e) => setLine({ ...line, quantity: Number(e.target.value) })} />
                </Field>
                <Field label="Rate (₹)">
                  <Input type="number" min={0} value={line.rate} onChange={(e) => setLine({ ...line, rate: Number(e.target.value) })} placeholder="0.00" />
                </Field>
                <div className="flex h-10 items-end">
                  <Button type="button" variant="secondary" onClick={addLine} className="w-full">
                    + Add Item
                  </Button>
                </div>
              </div>

              {form.items.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Added Items</p>
                  <ul className="space-y-2">
                    {form.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm shadow-sm">
                        <div>
                          <span className="font-semibold text-slate-800">{it.description}</span>
                          <span className="ml-2 text-xs text-slate-500">({it.quantity} × {fmt(it.rate)})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-medium text-slate-700">{fmt(it.quantity * it.rate)}</span>
                          <button type="button" onClick={() => removeLine(i)} className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline">
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Summary Box */}
                  <div className="mt-4 flex flex-col items-end border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <div className="flex justify-between w-48 py-1">
                      <span>Subtotal:</span>
                      <span className="font-mono">{fmt(form.items.reduce((s, it) => s + (it.quantity * it.rate), 0))}</span>
                    </div>
                    {Number(form.discount) > 0 && (
                      <div className="flex justify-between w-48 py-1 text-red-600">
                        <span>Discount:</span>
                        <span className="font-mono">-{fmt(Number(form.discount))}</span>
                      </div>
                    )}
                    <div className="flex justify-between w-48 py-1 border-t border-slate-200 font-bold text-slate-800 text-base">
                      <span>Total Net:</span>
                      <span className="font-mono">{fmt(Math.max(0, form.items.reduce((s, it) => s + (it.quantity * it.rate), 0) - (Number(form.discount) || 0)))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || form.items.length === 0}>
                {loading ? 'Creating...' : 'Create Bill'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {!bills ? (
          <Spinner label="Loading bills..." />
        ) : bills.length === 0 ? (
          <EmptyState message="No bills found" />
        ) : (
          <Table headers={['Bill No', 'Patient', 'Date', 'Net', 'Paid', 'Due', 'Status', '']}>
            {bills.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-emerald-700">{b.bill_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{b.patient_name}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(b.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-700">{fmt(b.net_amount)}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(b.paid_amount)}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(b.due_amount)}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(b.payment_status)}>{b.payment_status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setExpanded(b)} className="text-sm text-emerald-700 hover:underline">
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {expanded && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setExpanded(null)}>
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto" >
            <div onClick={(e) => e.stopPropagation()}>
              <CardHeader
                title={expanded.bill_no}
                subtitle={`${expanded.patient_name} • ${new Date(expanded.created_at).toLocaleString()}`}
                action={<Badge color={statusColor(expanded.payment_status)}>{expanded.payment_status}</Badge>}
              />
              <div className="space-y-4 p-5">
                {/* Itemized List */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Bill Items</p>
                  {expanded.items && expanded.items.length > 0 ? (
                    <div className="space-y-2">
                      {expanded.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <div>
                            <span className="font-semibold text-slate-800">{it.description}</span>
                            <span className="ml-2 text-xs text-slate-500">({it.quantity} × {fmt(it.rate)})</span>
                          </div>
                          <span className="font-mono font-medium text-slate-700">{fmt(it.quantity * it.rate)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No items added to this bill</p>
                  )}
                </div>

                <div className="rounded-lg bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Total</span>
                    <span>{fmt(expanded.total_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Discount</span>
                    <span>-{fmt(expanded.discount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 py-1 font-medium">
                    <span>Net</span>
                    <span>{fmt(expanded.net_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span>Paid</span>
                    <span>{fmt(expanded.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-red-600">
                    <span>Due</span>
                    <span>{fmt(expanded.due_amount)}</span>
                  </div>
                </div>

                {expanded.payment_status !== 'PAID' && (
                  <Can permission="billing.payment">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        pay(expanded.id)
                      }}
                      className="grid gap-3 sm:grid-cols-3"
                    >
                      <Field label="Amount *">
                        <Input type="number" min={0} step="any" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} required />
                      </Field>
                      <Field label="Method">
                        <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card</option>
                          <option value="UPI">UPI</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </Select>
                      </Field>
                      <div className="flex items-end">
                        <Button type="submit" disabled={loading}>
                          {loading ? '...' : 'Pay'}
                        </Button>
                      </div>
                    </form>
                  </Can>
                )}

                <button onClick={() => setExpanded(null)} className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
