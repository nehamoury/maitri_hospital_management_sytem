import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { hospitalInfo } from '../../design-system/tokens'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'
import { Receipt, Trash2, Printer, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

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

const statusColor = (s: string) => {
  switch (s) {
    case 'PAID':
      return 'green'
    case 'PARTIAL':
      return 'amber'
    case 'UNPAID':
      return 'red'
    default:
      return 'slate'
  }
}

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
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Invoices"
        subtitle="Manage hospital invoices, payment receipts, and refunds."
        action={
          <Can permission="billing.create">
            <Button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 shadow-sm">
              <Receipt className="h-4.5 w-4.5" />
              {showForm ? 'Cancel Invoice' : 'Create Bill'}
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
        <Card className="mb-6 animate-in fade-in slide-in-from-top-2 duration-150">
          <CardHeader title="Generate Invoice" />
          <form onSubmit={create} className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Select Patient *">
                <Select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
                  <option value="">Select a registered patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.uhid})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Flat Discount Amount (₹)">
                <Input type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0.00" />
              </Field>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-5">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">Add Billing Line Items</h4>
              <div className="grid gap-3 items-end sm:grid-cols-5">
                <div className="sm:col-span-2">
                  <Field label="Service / Item Description">
                    <Input value={line.description} onChange={(e) => setLine({ ...line, description: e.target.value })} placeholder="e.g. Shirodhara Session, Consultation..." />
                  </Field>
                </div>
                <Field label="Quantity">
                  <Input type="number" min={1} value={line.quantity} onChange={(e) => setLine({ ...line, quantity: Number(e.target.value) })} />
                </Field>
                <Field label="Unit Rate (₹)">
                  <Input type="number" min={0} value={line.rate} onChange={(e) => setLine({ ...line, rate: Number(e.target.value) })} placeholder="0.00" />
                </Field>
                <div className="flex h-10 items-end">
                  <Button type="button" variant="secondary" onClick={addLine} className="w-full">
                    + Add Item
                  </Button>
                </div>
              </div>

              {form.items.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Invoice Preview</p>
                  <ul className="space-y-2">
                    {form.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm">
                        <div>
                          <span className="font-semibold text-foreground">{it.description}</span>
                          <span className="ml-2 text-xs text-muted-foreground">({it.quantity} × {fmt(it.rate)})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-foreground">{fmt(it.quantity * it.rate)}</span>
                          <button type="button" onClick={() => removeLine(i)} className="text-xs font-semibold text-destructive hover:underline cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Summary Box */}
                  <div className="mt-4 flex flex-col items-end border-t border-border pt-3 text-sm text-muted-foreground">
                    <div className="flex justify-between w-48 py-1">
                      <span>Subtotal:</span>
                      <span className="font-mono text-foreground font-semibold">{fmt(form.items.reduce((s, it) => s + (it.quantity * it.rate), 0))}</span>
                    </div>
                    {Number(form.discount) > 0 && (
                      <div className="flex justify-between w-48 py-1 text-red-500">
                        <span>Discount:</span>
                        <span className="font-mono">-{fmt(Number(form.discount))}</span>
                      </div>
                    )}
                    <div className="flex justify-between w-48 py-1 border-t border-border font-bold text-foreground text-base">
                      <span>Total Net:</span>
                      <span className="font-mono text-primary">{fmt(Math.max(0, form.items.reduce((s, it) => s + (it.quantity * it.rate), 0) - (Number(form.discount) || 0)))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
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
          <Spinner label="Loading billing data..." />
        ) : bills.length === 0 ? (
          <EmptyState message="No bills generated yet" />
        ) : (
          <Table headers={['Bill No', 'Patient', 'Date', 'Net Total', 'Paid Amount', 'Due Balance', 'Status', '']}>
            {bills.map((b) => (
              <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{b.bill_no}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{b.patient_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(b.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td className="px-4 py-3 text-foreground font-mono font-bold text-xs">{fmt(b.net_amount)}</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-xs">{fmt(b.paid_amount)}</td>
                <td className="px-4 py-3 text-destructive font-mono font-semibold text-xs">{fmt(b.due_amount)}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(b.payment_status)}>{b.payment_status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openDetails(b)} className="text-sm font-semibold text-primary hover:underline cursor-pointer">
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {expanded && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setExpanded(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-card text-foreground rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-border"
          >
            <CardHeader
              title={expanded.bill_no}
              subtitle={`${expanded.patient_name} (${expanded.patient_uhid || '-'}) • ${new Date(expanded.created_at).toLocaleString()}`}
              action={<Badge color={statusColor(expanded.payment_status)}>{expanded.payment_status}</Badge>}
            />
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {detailLoading && <Spinner label="Refreshing bill data..." />}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Bill Line Items</p>
                {expanded.items && expanded.items.length > 0 ? (
                  <div className="space-y-2">
                    {expanded.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div>
                          <span className="font-semibold text-foreground">{it.description}</span>
                          <span className="ml-2 text-xs text-muted-foreground">({it.quantity} × {fmt(it.rate)})</span>
                        </div>
                        <span className="font-mono font-semibold text-foreground">{fmt(it.quantity * it.rate)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No items added to this bill</p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm space-y-2">
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Gross Total</span>
                  <span className="font-mono font-semibold text-foreground">{fmt(expanded.total_amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-red-500">
                  <span>Discount</span>
                  <span className="font-mono font-semibold">-{fmt(expanded.discount)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                  <span>Net Amount</span>
                  <span className="font-mono text-primary">{fmt(expanded.net_amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                  <span>Paid Total</span>
                  <span className="font-mono font-semibold">{fmt(expanded.paid_amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-destructive">
                  <span>Outstanding Balance</span>
                  <span className="font-mono font-bold">{fmt(expanded.due_amount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => printReceipt(expanded)}>
                  <Printer className="h-4.5 w-4.5 mr-1.5" /> Print Invoice Receipt
                </Button>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Payment History Ledger</p>
                {expanded.payments && expanded.payments.length > 0 ? (
                  <div className="space-y-2">
                    {expanded.payments.map((p) => {
                      const isRefund = p.amount < 0
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className={cn('inline-block w-16 rounded-full py-0.5 text-center text-[10px] font-bold uppercase', isRefund ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                              {isRefund ? 'Refund' : p.method}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString('en-IN')}</span>
                          </div>
                          <span className={cn('font-mono font-semibold', isRefund ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}>
                            {isRefund ? '-' : '+'}{fmtAbs(p.amount)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No payments recorded</p>
                )}
              </div>

              {expanded.payment_status !== 'PAID' && (
                <Can permission="billing.payment">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      pay(expanded.id)
                    }}
                    className="grid gap-3 sm:grid-cols-3 items-end border-t border-border pt-4"
                  >
                    <Field label="Amount to Collect *">
                      <Input type="number" min={0.01} step="any" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} required />
                    </Field>
                    <Field label="Payment Method">
                      <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </Select>
                    </Field>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Processing...' : 'Collect Payment'}
                    </Button>
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
                    className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3 dark:bg-red-950/10 dark:border-red-900/30"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Issue Invoice Refund
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={`Refund Amount (Max ${expanded.paid_amount.toFixed(2)}) *`}>
                        <Input type="number" min={0.01} max={expanded.paid_amount} step="any" value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} required />
                      </Field>
                      <Field label="Refund Reason Description">
                        <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Overcharged, treatment cancelled" />
                      </Field>
                    </div>
                    <Button type="submit" variant="danger" className="w-full" disabled={loading}>
                      {loading ? 'Processing...' : `Confirm Refund of ${fmtAbs(Number(refundAmt) || 0)}`}
                    </Button>
                  </form>
                </Can>
              )}

              <button onClick={() => setExpanded(null)} className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-all duration-200 cursor-pointer">
                Close Invoice Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
