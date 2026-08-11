import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { hospitalInfo } from '../../design-system/tokens'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

interface Bill {
  id: string
  bill_no: string
  patient_id: string
  patient_name: string
  patient_uhid?: string
  total_amount: number
  discount: number
  net_amount: number
  paid_amount: number
  due_amount: number
  payment_status: string
  billed_by: string
  created_at: string
  items?: BillItem[]
  payments?: Payment[]
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

interface Payment {
  id: string
  amount: number
  method: string
  reference?: string
  created_at: string
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
  const [detailLoading, setDetailLoading] = useState(false)
  const [payAmt, setPayAmt] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payRef, setPayRef] = useState('')
  const [refundAmt, setRefundAmt] = useState('')
  const [refundReason, setRefundReason] = useState('')
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

  const fetchDetail = (id: string) =>
    api.get<{ data: Bill }>(`/bills/${id}`).then((res) => {
      setExpanded(res.data.data)
      setDetailLoading(false)
      return res.data.data
    })

  const openDetails = (b: Bill) => {
    setError('')
    setExpanded(b)
    setDetailLoading(true)
    fetchDetail(b.id).catch((err) => {
      setDetailLoading(false)
      setError(errorMessage(err, 'Failed to load bill details'))
    })
  }

  // defaults for pay/refund are initialized inside openDetails

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
      openDetails(res.data.data)
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
      setDetailLoading(true)
      await fetchDetail(billId)
    } catch (err) {
      setError(errorMessage(err, 'Failed to record payment'))
    } finally {
      setLoading(false)
    }
  }

  const refund = async (billId: string) => {
    if (!refundAmt) return
    setLoading(true)
    setError('')
    try {
      await api.post(`/bills/${billId}/refunds`, {
        amount: Number(refundAmt),
        reason: refundReason || undefined,
      })
      setRefundAmt('')
      setRefundReason('')
      load()
      setDetailLoading(true)
      await fetchDetail(billId)
    } catch (err) {
      setError(errorMessage(err, 'Failed to record refund'))
    } finally {
      setLoading(false)
    }
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const fmtAbs = (n: number) => `₹${Math.abs(n).toFixed(2)}`

  const printReceipt = (b: Bill) => {
    const w = window.open('', '_blank', 'width=420,height=680')
    if (!w) return
    const items = (b.items ?? [])
      .map(
        (it) =>
          `<tr><td style="padding:4px 8px">${esc(it.description)}</td><td style="padding:4px 8px;text-align:center">${it.quantity}</td><td style="padding:4px 8px;text-align:right">${fmtAbs(it.rate)}</td><td style="padding:4px 8px;text-align:right">${fmtAbs(it.quantity * it.rate)}</td></tr>`,
      )
      .join('')
    const ledger = (b.payments ?? [])
      .map((p) => {
        const neg = p.amount < 0
        const col = neg ? '#DC2626' : '#334155'
        return `<tr style="color:${col}"><td style="padding:4px 8px;font-size:11px">${new Date(p.created_at).toLocaleString('en-IN')}</td><td style="padding:4px 8px;text-align:center">${esc(p.method)}</td><td style="padding:4px 8px;text-align:right">${neg ? '-' : '+'}${fmtAbs(p.amount)}</td></tr>`
      })
      .join('')
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8" /><title>Receipt ${esc(b.bill_no)}</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;margin:0;padding:24px}
      .head{text-align:center;border-bottom:2px solid #0F766E;padding-bottom:12px}
      .head h1{margin:0;font-size:20px;color:#0F766E}.head p{margin:2px 0;font-size:11px;color:#64748B}
      h2{font-size:14px;text-align:center;letter-spacing:2px;margin:16px 0 8px;color:#334155}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
      .totals td{padding:4px 8px}.totals .last td{border-top:2px solid #0F766E;font-weight:bold}
      .meta{font-size:12px;margin-top:12px;line-height:1.7}
      .mk{background:#0F766E;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;display:inline-block}
      .foot{text-align:center;font-size:11px;color:#64748B;margin-top:20px;border-top:1px dashed #CBD5E1;padding-top:10px}
      </style></head><body>
      <div class="head"><h1>${esc(hospitalInfo.name)}</h1><p>${esc(hospitalInfo.fullName)}</p><p>${esc(hospitalInfo.address)} · ${esc(hospitalInfo.phone)}</p></div>
      <h2>PAYMENT RECEIPT</h2>
      <div class="meta">
        <div><strong>Bill No:</strong> <span class="mk">${esc(b.bill_no)}</span></div>
        <div><strong>Patient:</strong> ${esc(b.patient_name)} <span style="color:#64748B">(${esc(b.patient_uhid || '-')})</span></div>
        <div><strong>Date:</strong> ${new Date(b.created_at).toLocaleString('en-IN')}</div>
        <div><strong>Billed By:</strong> ${esc(b.billed_by || '-')}</div>
        <div><strong>Status:</strong> ${b.payment_status}</div>
      </div>
      <table><thead><tr style="background:#F1F5F9"><th style="padding:6px 8px;text-align:left">Item</th><th style="padding:6px 8px">Qty</th><th style="padding:6px 8px;text-align:right">Rate</th><th style="padding:6px 8px;text-align:right">Amount</th></tr></thead><tbody>${items}</tbody></table>
      <table class="totals">
        <tr><td>Total</td><td style="text-align:right">${fmtAbs(b.total_amount)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right;color:#DC2626">-${fmtAbs(b.discount)}</td></tr>
        <tr class="last"><td>Net</td><td style="text-align:right">${fmtAbs(b.net_amount)}</td></tr>
        <tr><td>Paid</td><td style="text-align:right;color:#16A34A">${fmtAbs(b.paid_amount)}</td></tr>
        <tr><td>Due</td><td style="text-align:right;color:#DC2626">${fmtAbs(b.due_amount)}</td></tr>
      </table>
      ${ledger ? `<table><thead><tr style="background:#F1F5F9"><th style="padding:6px 8px;text-align:left;font-size:11px">Transaction Ledger</th><th style="padding:6px 8px;font-size:11px">Method</th><th style="padding:6px 8px;text-align:right;font-size:11px">Amount</th></tr></thead><tbody>${ledger}</tbody></table>` : ''}
      <div class="foot">Thank you for choosing ${esc(hospitalInfo.name)}. This is a computer-generated receipt.</div>
      </body></html>`,
    )
    w.document.close()
    w.focus()
    w.print()
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
                  <button onClick={() => openDetails(b)} className="text-sm text-emerald-700 hover:underline">
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
                subtitle={`${expanded.patient_name} (${expanded.patient_uhid || '-'}) • ${new Date(expanded.created_at).toLocaleString()}`}
                action={<Badge color={statusColor(expanded.payment_status)}>{expanded.payment_status}</Badge>}
              />
              <div className="space-y-4 p-5">
                {detailLoading && <Spinner label="Refreshing bill..." />}
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

                <Button variant="secondary" className="w-full" onClick={() => printReceipt(expanded)}>
                  Print Receipt
                </Button>

                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Payment Ledger</p>
                  {expanded.payments && expanded.payments.length > 0 ? (
                    <div className="space-y-2">
                      {expanded.payments.map((p) => {
                        const isRefund = p.amount < 0
                        return (
                          <div key={p.id} className="flex items-center justify-between text-sm">
                            <div>
                              <span className={`inline-block w-16 rounded-full py-0.5 text-center text-[10px] font-bold uppercase ${isRefund ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {isRefund ? 'Refund' : p.method}
                              </span>
                              <span className="ml-2 text-xs text-slate-400">{new Date(p.created_at).toLocaleString()}</span>
                            </div>
                            <span className={`font-mono ${isRefund ? 'text-red-600' : 'text-emerald-700'}`}>
                              {isRefund ? '-' : '+'}{fmtAbs(p.amount)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No payments recorded</p>
                  )}
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

                {expanded.paid_amount > 0 && (
                  <Can permission="billing.payment">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        refund(expanded.id)
                      }}
                      className="rounded-xl border border-red-100 bg-red-50/50 p-4"
                    >
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-400">Refund</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={`Amount (max ${expanded.paid_amount.toFixed(2)}) *`}>
                          <Input type="number" min={0.01} max={expanded.paid_amount} step="any" value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} required />
                        </Field>
                        <Field label="Reason">
                          <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Overcharged, cancelled service" />
                        </Field>
                      </div>
                      <Button type="submit" variant="danger" className="mt-3 w-full" disabled={loading}>
                        {loading ? 'Processing...' : `Refund ${fmtAbs(Number(refundAmt) || 0)}`}
                      </Button>
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
