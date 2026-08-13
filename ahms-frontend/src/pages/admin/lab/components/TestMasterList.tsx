import { useState, useEffect } from 'react'
import { labApi } from '@/lib/api'
import type { LabCategory, LabTest } from '@/lib/api'
import { Button, Input, Field } from '@/components/ui'
import { toast } from 'sonner'
import { Plus, Edit2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from 'lucide-react'

interface TestFormState {
  category_id: string
  name: string; code: string; sample_type: string; method: string; unit: string
  reference_range_male: string; reference_range_female: string; reference_range_child: string
  turnaround_hours: number; cost: number
}

const emptyTestForm: TestFormState = {
  category_id: '', name: '', code: '', sample_type: '', method: '', unit: '',
  reference_range_male: '', reference_range_female: '', reference_range_child: '',
  turnaround_hours: 24, cost: 0,
}

export function TestMasterList() {
  const [categories, setCategories] = useState<LabCategory[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [showCatForm, setShowCatForm] = useState(false)
  const [showTestForm, setShowTestForm] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', code: '', description: '' })
  const [testForm, setTestForm] = useState<TestFormState>(emptyTestForm)
  const [editingCat, setEditingCat] = useState<LabCategory | null>(null)
  const [editingTest, setEditingTest] = useState<LabTest | null>(null)

  const loadCategories = async () => {
    const res = await labApi.listCategories(false)
    if (res.data.success) setCategories(res.data.data)
  }

  const loadTests = async (catId?: string) => {
    const res = await labApi.listTests(catId, false)
    if (res.data.success) setTests(res.data.data)
  }

  useEffect(() => { loadCategories() }, [])
  useEffect(() => { loadTests() }, [])

  const submitCategory = async () => {
    try {
      if (editingCat) {
        await labApi.updateCategory(editingCat.id, catForm)
        toast.success('Category updated')
      } else {
        await labApi.createCategory(catForm)
        toast.success('Category created')
      }
      setShowCatForm(false); setEditingCat(null); setCatForm({ name: '', code: '', description: '' })
      loadCategories()
    } catch { toast.error('Failed to save category') }
  }

  const submitTest = async () => {
    try {
      if (editingTest) {
        await labApi.updateTest(editingTest.id, testForm)
        toast.success('Test updated')
      } else {
        await labApi.createTest(testForm)
        toast.success('Test created')
      }
      setShowTestForm(false); setEditingTest(null); setTestForm(emptyTestForm)
      loadTests()
    } catch { toast.error('Failed to save test') }
  }

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Categories</h2>
          <Button variant="primary" onClick={() => { setShowCatForm(true); setEditingCat(null); setCatForm({ name: '', code: '', description: '' }) }}>
            <Plus size={14} /> Add Category
          </Button>
        </div>

        {showCatForm && (
          <div className="px-6 py-4 bg-muted/20 border-b border-border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name"><Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Haematology" /></Field>
              <Field label="Code"><Input value={catForm.code} onChange={e => setCatForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g., HAEM" /></Field>
            </div>
            <Field label="Description"><Input value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} /></Field>
            <div className="flex gap-2">
              <Button variant="primary" onClick={submitCategory}>{editingCat ? 'Update' : 'Create'}</Button>
              <Button variant="ghost" onClick={() => setShowCatForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border">
          {categories.map(cat => (
            <div key={cat.id}>
              <div
                className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 cursor-pointer"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedCat === cat.id ? <ChevronDown size={16} className="text-teal-600" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                  <span className="font-semibold text-foreground">{cat.name}</span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{cat.code}</span>
                  {!cat.is_active && <span className="text-xs text-slate-400">(Inactive)</span>}
                </div>
                <Button variant="ghost" onClick={e => { e.stopPropagation(); setEditingCat(cat); setCatForm({ name: cat.name, code: cat.code, description: cat.description }); setShowCatForm(true) }}>
                  <Edit2 size={13} />
                </Button>
              </div>
              {expandedCat === cat.id && (
                <div className="px-10 py-3 bg-muted/10">
                  <div className="text-xs text-muted-foreground mb-2">
                    {tests.filter(t => t.category_id === cat.id).length} tests in this category
                  </div>
                  {tests.filter(t => t.category_id === cat.id).map(test => (
                    <div key={test.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <span className="font-semibold text-sm text-foreground">{test.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">[{test.code}]</span>
                        <span className="ml-2 text-xs text-muted-foreground">· {test.sample_type} · {test.unit}</span>
                        {!test.is_active && <span className="ml-2 text-xs text-slate-400">(Inactive)</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">₹{test.cost}</span>
                        <Button variant="ghost" onClick={() => { setEditingTest(test); setTestForm({ ...test, category_id: test.category_id }); setShowTestForm(true) }}>
                          <Edit2 size={13} />
                        </Button>
                        <button onClick={() => labApi.updateTest(test.id, { is_active: !test.is_active }).then(() => loadTests())} className="text-muted-foreground hover:text-foreground">
                          {test.is_active ? <ToggleRight size={18} className="text-teal-600" /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Test */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Tests</h2>
          <Button variant="primary" onClick={() => { setShowTestForm(true); setEditingTest(null); setTestForm(emptyTestForm) }}>
            <Plus size={14} /> Add Test
          </Button>
        </div>

        {showTestForm && (
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm" value={testForm.category_id} onChange={e => setTestForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Test Name"><Input value={testForm.name} onChange={e => setTestForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Haemoglobin" /></Field>
              <Field label="Code"><Input value={testForm.code} onChange={e => setTestForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g., HB" /></Field>
              <Field label="Sample Type"><Input value={testForm.sample_type} onChange={e => setTestForm(f => ({ ...f, sample_type: e.target.value }))} placeholder="e.g., Venous Blood" /></Field>
              <Field label="Unit"><Input value={testForm.unit} onChange={e => setTestForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g., g/dL" /></Field>
              <Field label="Method"><Input value={testForm.method} onChange={e => setTestForm(f => ({ ...f, method: e.target.value }))} /></Field>
              <Field label="Ref Range (Male)"><Input value={testForm.reference_range_male} onChange={e => setTestForm(f => ({ ...f, reference_range_male: e.target.value }))} placeholder="e.g., 13.0–17.0" /></Field>
              <Field label="Ref Range (Female)"><Input value={testForm.reference_range_female} onChange={e => setTestForm(f => ({ ...f, reference_range_female: e.target.value }))} placeholder="e.g., 12.0–16.0" /></Field>
              <Field label="Ref Range (Child)"><Input value={testForm.reference_range_child} onChange={e => setTestForm(f => ({ ...f, reference_range_child: e.target.value }))} /></Field>
              <Field label="Turnaround (hrs)"><Input type="number" value={testForm.turnaround_hours} onChange={e => setTestForm(f => ({ ...f, turnaround_hours: +e.target.value }))} /></Field>
              <Field label="Cost (₹)"><Input type="number" value={testForm.cost} onChange={e => setTestForm(f => ({ ...f, cost: +e.target.value }))} /></Field>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={submitTest}>{editingTest ? 'Update Test' : 'Create Test'}</Button>
              <Button variant="ghost" onClick={() => setShowTestForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
