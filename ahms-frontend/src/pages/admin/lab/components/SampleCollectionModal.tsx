import { useState } from 'react'
import { labApi } from '@/lib/api'
import { Button, Input, Field } from '@/components/ui'
import { toast } from 'sonner'
import { X, TestTube } from 'lucide-react'

interface Props { orderId: string; onClose: () => void; onDone: () => void }

export function SampleCollectionModal({ orderId, onClose, onDone }: Props) {
  const [form, setForm] = useState({
    sample_type: '', collection_method: '', barcode: '',
    volume_ml: '', notes: '', is_adequate: true
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!form.sample_type) { toast.error('Sample type is required'); return }
    setSubmitting(true)
    try {
      await labApi.collectSample(orderId, {
        ...form,
        volume_ml: form.volume_ml ? parseFloat(form.volume_ml) : undefined,
        is_adequate: form.is_adequate
      })
      toast.success('Sample collected')
      onDone()
    } catch { toast.error('Failed to record sample collection') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <TestTube size={18} className="text-teal-600" />
            <h2 className="font-bold text-foreground">Record Sample Collection</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Sample Type *"><Input value={form.sample_type} onChange={e => setForm(f => ({ ...f, sample_type: e.target.value }))} placeholder="e.g., Venous Blood, Urine, Stool" /></Field>
          <Field label="Collection Method"><Input value={form.collection_method} onChange={e => setForm(f => ({ ...f, collection_method: e.target.value }))} placeholder="e.g., Venipuncture" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Barcode"><Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} /></Field>
            <Field label="Volume (mL)"><Input type="number" value={form.volume_ml} onChange={e => setForm(f => ({ ...f, volume_ml: e.target.value }))} /></Field>
          </div>
          <Field label="Notes"><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_adequate} onChange={e => setForm(f => ({ ...f, is_adequate: e.target.checked }))} className="rounded accent-teal-600 w-4 h-4" />
            <span className="text-sm font-semibold text-foreground">Sample is adequate for testing</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Record Collection'}
          </Button>
        </div>
      </div>
    </div>
  )
}
