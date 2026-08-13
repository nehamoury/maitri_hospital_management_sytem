import { useState } from 'react'
import { dietApi } from '@/lib/api'
import { Button, Input, Field } from '@/components/ui'
import { toast } from 'sonner'
import { X, Apple } from 'lucide-react'

interface Props {
  admissionId: string
  patientId: string
  onClose: () => void
  onDone: () => void
}

export function PrescribeDietModal({ admissionId, patientId, onClose, onDone }: Props) {
  const [form, setForm] = useState({
    diet_type: '',
    pathya: '',
    apathya: '',
    special_instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.diet_type.trim()) {
      toast.error('Diet Type is required')
      return
    }
    setSubmitting(true)
    try {
      await dietApi.createDietPlan({
        admission_id: admissionId,
        patient_id: patientId,
        ...form
      })
      toast.success('Diet plan prescribed successfully')
      onDone()
    } catch {
      toast.error('Failed to prescribe diet plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Apple size={18} className="text-teal-600" />
            <h2 className="font-bold text-foreground">Prescribe IPD Diet Plan</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Diet Type *">
            <Input
              value={form.diet_type}
              onChange={e => setForm(f => ({ ...f, diet_type: e.target.value }))}
              placeholder="e.g., Laghu Ahar, Peyadi, Dashamula Kanjy"
              required
            />
          </Field>
          <Field label="Pathya (Recommended Foods/Do's)">
            <Input
              value={form.pathya}
              onChange={e => setForm(f => ({ ...f, pathya: e.target.value }))}
              placeholder="e.g., Warm water, Mudga Yusha (mung soup)"
            />
          </Field>
          <Field label="Apathya (Restricted Foods/Dont's)">
            <Input
              value={form.apathya}
              onChange={e => setForm(f => ({ ...f, apathya: e.target.value }))}
              placeholder="e.g., Curd, oily food, cold water"
            />
          </Field>
          <Field label="Special Instructions">
            <Input
              value={form.special_instructions}
              onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))}
              placeholder="e.g., Serve warm at 8 AM"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </Field>
            <Field label="End Date">
              <Input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </Field>
          </div>
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Prescribing...' : 'Prescribe Diet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
