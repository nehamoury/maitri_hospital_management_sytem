import { useState, useEffect } from 'react'
import { labApi } from '@/lib/api'
import type { LabOrder } from '@/lib/api'
import { Button } from '@/components/ui'
import { LabStatusBadge } from './LabStatusBadge'
import { FLAG_CONFIG, ITEM_STATUS_CONFIG } from '../types'
import {
  ArrowLeft, Printer, FlaskConical, TestTube, User,
  ClipboardCheck, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  orderId: string
  onBack: () => void
  onWorkflowAction: () => void
  canCollect: boolean
  canResult: boolean
  canVerify: boolean
  canReview: boolean
}

export function LabOrderDetail({ orderId, onBack, onWorkflowAction, canCollect, canVerify }: Props) {
  const [order, setOrder] = useState<LabOrder | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await labApi.getOrder(orderId)
      if (res.data.success) setOrder(res.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [orderId])

  const handleMarkProcessing = async () => {
    try {
      await labApi.markProcessing(orderId)
      toast.success('Marked as processing')
      onWorkflowAction(); load()
    } catch { toast.error('Action failed') }
  }

  const handleVerify = async () => {
    try {
      await labApi.verifyResults(orderId)
      toast.success('Results verified')
      onWorkflowAction(); load()
    } catch { toast.error('Action failed') }
  }

  const handlePrint = async () => {
    try { await labApi.printReport(orderId) }
    catch { toast.error('Failed to open report') }
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading...</div>
  if (!order) return <div className="text-center py-20 text-muted-foreground">Order not found</div>

  const hasCritical = order.items.some(i => i.result_flag === 'CRITICAL')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}><ArrowLeft size={16} /> Back</Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground font-mono">{order.order_no}</h1>
              <LabStatusBadge status={order.status} />
              {order.priority !== 'ROUTINE' && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${order.priority === 'STAT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {order.priority}
                </span>
              )}
              {hasCritical && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <AlertTriangle size={12} /> CRITICAL RESULT
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Ordered by {order.ordered_by} · {new Date(order.created_at).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(order.status === 'RESULT_AVAILABLE' || order.status === 'DOCTOR_REVIEWED') && (
            <Button variant="secondary" onClick={handlePrint}><Printer size={14} /> Print Report</Button>
          )}
          {canCollect && order.status === 'SAMPLE_COLLECTED' && (
            <Button variant="primary" onClick={handleMarkProcessing}><FlaskConical size={14} /> Mark Processing</Button>
          )}
          {canVerify && (order.status === 'PROCESSING' || order.status === 'RESULT_AVAILABLE') && (
            <Button variant="primary" onClick={handleVerify}><CheckCircle2 size={14} /> Verify Results</Button>
          )}
        </div>
      </div>

      {/* Patient + Sample info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-teal-600" />
            <h3 className="font-bold text-foreground">Patient Info</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-semibold">{order.patient_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">UHID</span><span className="font-mono text-xs font-semibold">{order.patient_uhid}</span></div>
            {order.clinical_notes && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Clinical Notes</p>
                <p className="text-sm text-foreground">{order.clinical_notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TestTube size={16} className="text-teal-600" />
            <h3 className="font-bold text-foreground">Sample Details</h3>
          </div>
          {order.sample ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold">{order.sample.sample_type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{order.sample.collection_method}</span></div>
              {order.sample.barcode && <div className="flex justify-between"><span className="text-muted-foreground">Barcode</span><span className="font-mono">{order.sample.barcode}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Collected By</span><span>{order.sample.collected_by_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Collected At</span><span>{new Date(order.sample.collected_at).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Adequate</span><span className={order.sample.is_adequate ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{order.sample.is_adequate ? 'Yes' : 'No'}</span></div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-sm gap-2">
              <Clock size={20} className="text-muted-foreground/50" />
              <p>Sample not yet collected</p>
            </div>
          )}
        </div>
      </div>

      {/* Test Results Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <ClipboardCheck size={16} className="text-teal-600" />
          <h3 className="font-bold text-foreground">Test Results ({order.items.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Test', 'Sample Type', 'Result', 'Reference Range', 'Flag', 'Remarks', 'Status', 'Resulted By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map(item => {
                const flag = FLAG_CONFIG[item.result_flag ?? '']
                const sts = ITEM_STATUS_CONFIG[item.status] ?? { label: item.status, color: 'text-muted-foreground' }
                return (
                  <tr key={item.id} className={item.result_flag === 'CRITICAL' ? 'bg-red-50/30' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{item.test_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">[{item.test_code}]</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{item.sample_type}</td>
                    <td className="px-4 py-3">
                      {item.result_value ? (
                        <div>
                          <span className={`font-bold text-base ${flag?.color ?? 'text-foreground'}`}>{item.result_value}</span>
                          <span className="ml-1 text-xs text-muted-foreground">{item.result_unit || item.test_unit}</span>
                          {item.result_text && <p className="text-xs text-muted-foreground mt-1 italic">{item.result_text}</p>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.reference_range_snapshot || '—'}</td>
                    <td className="px-4 py-3">
                      {flag ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${flag.bg} ${flag.color}`}>{flag.label}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px]">{item.remarks || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold ${sts.color}`}>{sts.label}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.resulted_by_name && <div>{item.resulted_by_name}</div>}
                      {item.resulted_at && <div className="text-muted-foreground/70">{new Date(item.resulted_at).toLocaleDateString('en-IN')}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Remarks */}
      {order.doctor_remarks && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><User size={14} /> Doctor's Remarks</h3>
          <p className="text-sm text-amber-900">{order.doctor_remarks}</p>
          {order.reviewed_by && (
            <p className="mt-2 text-xs text-amber-700">— {order.reviewed_by}{order.reviewed_at ? `, ${new Date(order.reviewed_at).toLocaleString('en-IN')}` : ''}</p>
          )}
        </div>
      )}
    </div>
  )
}
