import { useEffect, useState } from 'react'
import { dietApi } from '@/lib/api'
import { Button, Input, Field } from '@/components/ui'
import { toast } from 'sonner'
import { X, Apple } from 'lucide-react'
import type { DietTemplate, DietPlan } from '../types'

interface Props {
  admissionId: string
  patientId: string
  plan?: DietPlan
  onClose: () => void
  onDone: () => void
}

export function PrescribeDietModal({ admissionId, patientId, plan, onClose, onDone }: Props) {
  const [form, setForm] = useState({
    diet_type: plan?.diet_type ?? '',
    pathya: plan?.pathya ?? '',
    apathya: plan?.apathya ?? '',
    special_instructions: plan?.special_instructions ?? '',
    start_date: plan?.start_date
      ? plan.start_date.slice(0, 10)
      : new Date().toISOString().split('T')[0],
    end_date: plan?.end_date
      ? plan.end_date.slice(0, 10)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })
  const [templates, setTemplates] = useState<DietTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!plan

  useEffect(() => {
    dietApi.listDietTemplates(true)
      .then(res => { if (res.data.success) setTemplates(res.data.data ?? []) })
      .catch(() => {})
  }, [])

  const applyTemplate = (id: string) => {
    setSelectedTemplate(id)
    const t = templates.find(x => x.id === id)
    if (!t) return
    setForm(f => ({
      ...f,
      diet_type: t.name,
      pathya: t.pathya ?? '',
      apathya: t.apathya ?? '',
      special_instructions: t.special_instructions ?? '',
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.diet_type.trim()) {
      toast.error('Diet Type is required')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && plan) {
        await dietApi.updateDietPlan(plan.id, {
          admission_id: admissionId,
          patient_id: patientId,
          ...form,
        })
        toast.success('Diet plan updated successfully')
      } else {
        await dietApi.createDietPlan({
          admission_id: admissionId,
          patient_id: patientId,
          ...form,
        })
        toast.success('Diet plan prescribed successfully')
      }
      onDone()
    } catch (err: any) {
      const msg = err.response?.data?.error || (isEdit ? 'Failed to update diet plan' : 'Failed to prescribe diet plan')
      toast.error(msg)
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
            <h2 className="font-bold text-foreground">{isEdit ? 'Edit IPD Diet Plan' : 'Prescribe IPD Diet Plan'}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {templates.length > 0 && !isEdit && (
            <Field label="Pre-fill from Template">
              <select
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
                value={selectedTemplate}
                onChange={e => applyTemplate(e.target.value)}
              >
                <option value="">Select a diet template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
          )}
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
              {submitting ? (isEdit ? 'Updating...' : 'Prescribing...') : (isEdit ? 'Update Diet' : 'Prescribe Diet')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
