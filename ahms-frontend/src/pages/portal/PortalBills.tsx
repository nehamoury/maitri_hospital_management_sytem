import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ArrowLeft, Receipt, ShieldAlert, CreditCard } from 'lucide-react'
import { portalApi, errorMessage } from '../../lib/api'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui'

interface BillItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Payment {
  amount: number
  method: string
  date: string
}

interface Bill {
  id: string
  bill_no: string
  date: string
  total_amount: number
  discount: number
  net_amount: number
  paid_amount: number
  due_amount: number
  payment_status: string
  items: BillItem[]
  payments: Payment[]
}

export default function PortalBills() {
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Bill | null>(null)

  useEffect(() => {
    portalApi
      .get<{ data: Bill[] }>('/portal/bills')
      .then((res) => setBills(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load bills')))
  }, [])

  const statusColor = (s: string) =>
    s === 'PAID' ? 'green' : s === 'PARTIAL' ? 'amber' : s === 'UNPAID' ? 'red' : 'slate'
  
  const fmt = (n: number) => `₹${n.toFixed(2)}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">My Invoices</h1>
          <p className="text-sm text-slate-500">Track and manage your billing history and payments</p>
        </div>
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Portal
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {!bills ? (
        <div className="flex justify-center py-12"><Spinner label="Loading bills..." /></div>
      ) : bills.length === 0 ? (
        <Card className="border-slate-100 shadow-sm">
          <div className="py-12">
            <EmptyState message="No bills or payments recorded yet." />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bills.map((b) => (
            <Card key={b.id} className="border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl flex flex-col justify-between">
              <div>
                <div className="bg-slate-50/50 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4.5 w-4.5 text-slate-400" />
                    <span className="font-mono text-xs font-bold text-slate-700">{b.bill_no}</span>
                  </div>
                  <Badge color={statusColor(b.payment_status)}>{b.payment_status}</Badge>
                </div>
                
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(b.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Net Amount</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{fmt(b.net_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Paid</p>
                      <p className="text-sm font-semibold text-emerald-700 mt-0.5">{fmt(b.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Outstanding</p>
                      <p className={`text-sm font-bold mt-0.5 ${b.due_amount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {fmt(b.due_amount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/20 px-5 py-3 border-t border-slate-50 flex justify-end">
                <button 
                  onClick={() => setExpanded(b)} 
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  View Details & Receipt
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Details Modal */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setExpanded(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-6">
              
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-lg">{expanded.bill_no}</h3>
                    <Badge color={statusColor(expanded.payment_status)}>{expanded.payment_status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Billed on {new Date(expanded.date).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => setExpanded(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
              </div>

              {/* Items Table */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Bill Breakdown</p>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Rate</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expanded.items.map((it, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-700 font-semibold">{it.description}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{it.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">{fmt(it.rate)}</td>
                          <td className="px-4 py-3 text-right text-slate-800 font-semibold font-mono text-xs">{fmt(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="rounded-2xl bg-slate-50 p-5 space-y-2.5 text-sm border border-slate-100">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="font-mono text-slate-700">{fmt(expanded.total_amount)}</span>
                </div>
                {expanded.discount > 0 && (
                  <div className="flex justify-between py-0.5 text-rose-600">
                    <span className="font-medium">Discount applied</span>
                    <span className="font-mono">-{fmt(expanded.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2.5 font-bold text-slate-900 text-base">
                  <span>Net Amount</span>
                  <span className="font-mono">{fmt(expanded.net_amount)}</span>
                </div>
              </div>

              {/* Payments History */}
              {expanded.payments && expanded.payments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Payment Transactions</p>
                  <div className="space-y-2">
                    {expanded.payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/20 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2.5 text-emerald-800">
                          <CreditCard className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-semibold">{p.method}</p>
                            <p className="text-[10px] text-emerald-600/70">{new Date(p.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-800">{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Balance */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                <div className="rounded-xl bg-emerald-50/30 p-3.5 border border-emerald-100 text-center">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Total Paid</p>
                  <p className="text-base font-extrabold text-emerald-800 mt-1">{fmt(expanded.paid_amount)}</p>
                </div>
                <div className={`rounded-xl p-3.5 text-center border ${expanded.due_amount > 0 ? 'bg-rose-50/30 border-rose-100 text-rose-700' : 'bg-slate-50/50 border-slate-100 text-slate-700'}`}>
                  <p className="text-[10px] font-bold uppercase">Balance Due</p>
                  <p className="text-base font-extrabold mt-1">{fmt(expanded.due_amount)}</p>
                </div>
              </div>

              <button 
                onClick={() => setExpanded(null)} 
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-md"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
