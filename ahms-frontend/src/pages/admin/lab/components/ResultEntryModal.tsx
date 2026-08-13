import { useState } from 'react'
import { labApi } from '@/lib/api'
import type { LabOrderItem } from '@/lib/api'
import { Button, Input, Field } from '@/components/ui'
import { toast } from 'sonner'
import { X, ClipboardList } from 'lucide-react'

const FLAGS = ['NORMAL', 'LOW', 'HIGH', 'CRITICAL']
const FLAG_COLORS: Record<string, string> = {
  NORMAL: 'text-emerald-700', LOW: 'text-amber-700', HIGH: 'text-red-700', CRITICAL: 'text-red-800 font-bold',
}

interface ItemResult {
  item_id: string
  result_value: string
  result_unit: string
  result_text: string
  result_flag: string
  remarks: string
}

interface Props {
  orderId: string
  items: LabOrderItem[]
  onClose: () => void
  onDone: () => void
}

export function ResultEntryModal({ orderId, items, onClose, onDone }: Props) {
  const pendingItems = items.filter(i => i.status === 'PENDING' || i.status === 'PROCESSING' || i.status === 'RESULT_ENTERED')

  const [results, setResults] = useState<ItemResult[]>(
    pendingItems.map(i => ({
      item_id: i.id,
      result_value: i.result_value ?? '',
      result_unit: i.result_unit ?? i.test_unit,
      result_text: i.result_text ?? '',
      result_flag: i.result_flag ?? 'NORMAL',
      remarks: i.remarks ?? '',
    }))
  )
  const [submitting, setSubmitting] = useState(false)

  const update = (idx: number, field: keyof ItemResult, value: string) => {
    setResults(r => r.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      await labApi.enterResults(orderId, results)
      toast.success('Results saved')
      onDone()
    } catch { toast.error('Failed to save results') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-teal-600" />
            <h2 className="font-bold text-foreground">Enter Test Results</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {results.map((r, idx) => {
            const item = pendingItems[idx]
            return (
              <div key={r.item_id} className="bg-muted/20 rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-foreground">{item.test_name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">[{item.test_code}] · {item.sample_type}</p>
                    {item.reference_range_snapshot && (
                      <p className="text-xs text-muted-foreground mt-0.5">Ref: {item.reference_range_snapshot}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {FLAGS.map(flag => (
                      <button
                        key={flag}
                        onClick={() => update(idx, 'result_flag', flag)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${r.result_flag === flag ? 'border-current shadow-sm scale-105' : 'border-transparent opacity-50'} ${FLAG_COLORS[flag]}`}
                      >
                        {flag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Result Value">
                    <Input value={r.result_value} onChange={e => update(idx, 'result_value', e.target.value)} placeholder="e.g., 13.5" />
                  </Field>
                  <Field label="Unit">
                    <Input value={r.result_unit} onChange={e => update(idx, 'result_unit', e.target.value)} placeholder={item.test_unit} />
                  </Field>
                  <Field label="Qualitative / Narrative Result (optional)">
                    <Input value={r.result_text} onChange={e => update(idx, 'result_text', e.target.value)} placeholder="e.g., Positive, Negative, Trace amounts..." />
                  </Field>
                  <Field label="Remarks">
                    <Input value={r.remarks} onChange={e => update(idx, 'remarks', e.target.value)} />
                  </Field>
                </div>
              </div>
            )
          })}

          {results.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">All items are already verified</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={submitting || results.length === 0}>
            {submitting ? 'Saving...' : 'Save Results'}
          </Button>
        </div>
      </div>
    </div>
  )
}
