import { useState, useEffect, useCallback } from 'react'
import { labApi } from '@/lib/api'
import type { LabOrderListItem } from '@/lib/api'
import { Input, Select, Button } from '@/components/ui'
import { LabStatusBadge } from './LabStatusBadge'
import { PRIORITY_CONFIG } from '../types'
import { FlaskConical, Eye, RefreshCw, AlertTriangle } from 'lucide-react'

interface Props {
  onSelect: (id: string) => void
}

const STATUSES = ['', 'ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'RESULT_AVAILABLE', 'DOCTOR_REVIEWED', 'CANCELLED']

export function LabOrderList({ onSelect }: Props) {
  const [orders, setOrders] = useState<LabOrderListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 20 }
      if (status) params.status = status
      if (from) params.from = from
      if (to) params.to = to
      const res = await labApi.listOrders(params)
      if (res.data.success) {
        setOrders(res.data.data.data ?? [])
        setTotal(res.data.data.total ?? 0)
      }
    } catch { /* handled */ }
    finally { setLoading(false) }
  }, [page, status, from, to])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? orders.filter(o =>
        o.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        o.patient_uhid.toLowerCase().includes(search.toLowerCase()) ||
        o.order_no.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Search</label>
          <Input placeholder="Patient name, UHID, order no..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">From</label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">To</label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-teal-600" />
            <h2 className="font-bold text-foreground">Lab Orders</h2>
          </div>
          <span className="text-xs text-muted-foreground">{total} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Order No', 'Patient', 'Priority', 'Tests', 'Pending', 'Status', 'Ordered By', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">No orders found</td></tr>
              ) : filtered.map(o => {
                const prio = PRIORITY_CONFIG[o.priority] ?? { label: o.priority, color: 'text-slate-600' }
                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => onSelect(o.id)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-teal-700">{o.order_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{o.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{o.patient_uhid}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${prio.color}`}>{prio.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">{o.test_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.pending_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <AlertTriangle size={12} />
                          {o.pending_count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><LabStatusBadge status={o.status} size="sm" /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{o.ordered_by}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" onClick={e => { e.stopPropagation(); onSelect(o.id) }}>
                        <Eye size={14} />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {total > 20 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
