import { useState, useEffect } from 'react'
import { labApi } from '@/lib/api'
import type { LabCategory, LabTest } from '@/lib/api'
import { Button, Input, Field } from '@/components/ui'
import { toast } from 'sonner'
import { X, Search, FlaskConical } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: () => void
}

interface SelectedTest { id: string; name: string; code: string; sample_type: string }

export function CreateOrderModal({ onClose, onCreated }: Props) {
  const [categories, setCategories] = useState<LabCategory[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([])
  const [testSearch, setTestSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [form, setForm] = useState({
    patient_id: '', encounter_id: '', admission_id: '',
    priority: 'ROUTINE', clinical_notes: ''
  })
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    labApi.listCategories(true).then(r => { if (r.data.success) setCategories(r.data.data) })
    labApi.listTests(undefined, true).then(r => { if (r.data.success) setTests(r.data.data) })
  }, [])

  const searchPatients = async (q: string) => {
    if (q.length < 2) { setPatients([]); return }
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ahms_token')}` }
      })
      const data = await res.json()
      setPatients(data.data?.patients ?? [])
    } catch { /* */ }
  }

  const filteredTests = tests.filter(t =>
    (!selectedCat || t.category_id === selectedCat) &&
    (!testSearch || t.name.toLowerCase().includes(testSearch.toLowerCase()) || t.code.toLowerCase().includes(testSearch.toLowerCase()))
  )

  const toggleTest = (test: LabTest) => {
    setSelectedTests(prev =>
      prev.find(t => t.id === test.id)
        ? prev.filter(t => t.id !== test.id)
        : [...prev, { id: test.id, name: test.name, code: test.code, sample_type: test.sample_type }]
    )
  }

  const submit = async () => {
    if (!form.patient_id) { toast.error('Select a patient'); return }
    if (selectedTests.length === 0) { toast.error('Select at least one test'); return }
    setSubmitting(true)
    try {
      await labApi.createOrder({
        ...form,
        items: selectedTests.map(t => ({ test_id: t.id }))
      })
      toast.success('Lab order created')
      onCreated()
    } catch { toast.error('Failed to create order') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-teal-600" />
            <h2 className="text-lg font-bold text-foreground">New Lab Order</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Patient */}
          <div>
            <Field label="Patient Search">
              <Input placeholder="Search by name, UHID, or mobile..."
                value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value) }}
              />
            </Field>
            {patients.length > 0 && (
              <div className="mt-1 border border-border rounded-xl overflow-hidden bg-card shadow-md">
                {patients.map((p: any) => (
                  <button key={p.id}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/30 border-b border-border/50 last:border-0 ${form.patient_id === p.id ? 'bg-teal-50' : ''}`}
                    onClick={() => { setForm(f => ({ ...f, patient_id: p.id })); setPatientSearch(`${p.full_name} (${p.uh_id})`); setPatients([]) }}
                  >
                    <span className="font-semibold">{p.full_name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">{p.uh_id} · {p.mobile}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority + Optional refs */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Priority">
              <select className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm"
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT</option>
              </select>
            </Field>
            <Field label="Encounter ID (optional)"><Input value={form.encounter_id} onChange={e => setForm(f => ({ ...f, encounter_id: e.target.value }))} placeholder="UUID" /></Field>
            <Field label="Admission ID (optional)"><Input value={form.admission_id} onChange={e => setForm(f => ({ ...f, admission_id: e.target.value }))} placeholder="UUID" /></Field>
          </div>

          <Field label="Clinical Notes"><Input value={form.clinical_notes} onChange={e => setForm(f => ({ ...f, clinical_notes: e.target.value }))} placeholder="Reason for investigation..." /></Field>

          {/* Test selection */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search tests..." value={testSearch} onChange={e => setTestSearch(e.target.value)} />
                </div>
              </div>
              <select className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
                value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {filteredTests.map(test => {
                const selected = selectedTests.some(t => t.id === test.id)
                return (
                  <label key={test.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/20 ${selected ? 'bg-teal-50' : ''}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleTest(test)} className="rounded accent-teal-600" />
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-foreground">{test.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">[{test.code}]</span>
                      <span className="ml-2 text-xs text-muted-foreground">· {test.sample_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">₹{test.cost}</span>
                  </label>
                )
              })}
              {filteredTests.length === 0 && (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">No tests found</div>
              )}
            </div>

            {selectedTests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTests.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1.5 bg-teal-100 text-teal-800 rounded-full px-3 py-1 text-xs font-semibold">
                    {t.name}
                    <button onClick={() => setSelectedTests(prev => prev.filter(x => x.id !== t.id))} className="hover:text-teal-600"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{selectedTests.length} test(s) selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
