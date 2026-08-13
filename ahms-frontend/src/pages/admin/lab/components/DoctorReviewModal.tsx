import { useState } from 'react'
import { labApi } from '@/lib/api'
import { Button } from '@/components/ui'
import { toast } from 'sonner'
import { X, Stethoscope } from 'lucide-react'

interface Props { orderId: string; onClose: () => void; onDone: () => void }

export function DoctorReviewModal({ orderId, onClose, onDone }: Props) {
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!remarks.trim()) { toast.error('Doctor remarks are required'); return }
    setSubmitting(true)
    try {
      await labApi.doctorReview(orderId, remarks)
      toast.success('Review submitted')
      onDone()
    } catch { toast.error('Failed to submit review') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-teal-600" />
            <h2 className="font-bold text-foreground">Doctor Review</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-semibold text-muted-foreground mb-2">Clinical Remarks *</label>
          <textarea
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm resize-none h-36 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Interpretation and clinical action plan..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </div>
  )
}
