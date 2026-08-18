import { useState, useEffect, useCallback } from 'react'
import { dietApi } from '@/lib/api'
import type { MealOrder, WardOption, KitchenAdmission } from './types'
import { MEAL_STATUS_CONFIG, MEAL_TYPE_CONFIG } from './types'
import { Input, Button } from '@/components/ui'
import { toast } from 'sonner'
import { Can } from '@/lib/can'
import {
  ChefHat,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Ban,
  X,
  AlertCircle,
} from 'lucide-react'

interface ManualMealForm {
  admission_id: string
  meal_type: string
  scheduled_date: string
  special_instructions: string
}

export default function KitchenDashboard() {
  const [meals, setMeals] = useState<MealOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Filters
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mealType, setMealType] = useState<string>('')
  const [wardFilter, setWardFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Dynamic ward options (real wards with active admissions)
  const [wards, setWards] = useState<WardOption[]>([])
  const [wardLoading, setWardLoading] = useState(false)

  // Manual meal modal
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [addMealForm, setAddMealForm] = useState<ManualMealForm>({
    admission_id: '',
    meal_type: 'BREAKFAST',
    scheduled_date: new Date().toISOString().split('T')[0],
    special_instructions: '',
  })
  const [admissions, setAdmissions] = useState<KitchenAdmission[]>([])
  const [submittingMeal, setSubmittingMeal] = useState(false)

  // Cancel meal modal
  const [cancelTarget, setCancelTarget] = useState<MealOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { date }
      if (mealType) params.meal_type = mealType
      if (wardFilter) params.ward_id = wardFilter
      const res = await dietApi.getKitchenSheet(params)
      if (res.data.success) {
        setMeals(res.data.data ?? [])
      }
    } catch {
      toast.error('Failed to load kitchen sheet')
    } finally {
      setLoading(false)
    }
  }, [date, mealType, wardFilter])

  useEffect(() => { load() }, [load])

  const loadWards = useCallback(async () => {
    setWardLoading(true)
    try {
      const res = await dietApi.getWardList()
      if (res.data.success) setWards(res.data.data ?? [])
    } catch {
      // Non-fatal: the sheet still loads; fall back to wards derived from data.
    } finally {
      setWardLoading(false)
    }
  }, [])

  useEffect(() => { loadWards() }, [loadWards])

  // Fallback ward options derived from the loaded sheet (by name).
  const fallbackWards: WardOption[] = meals
    .filter((m, i, arr) => arr.findIndex(x => x.ward_name === m.ward_name) === i)
    .map(m => ({ id: m.ward_name, code: m.ward_name, name: m.ward_name }))
  const wardOptions = wards.length > 0 ? wards : fallbackWards

  const openAddMeal = async () => {
    setShowAddMeal(true)
    setAddMealForm(f => ({ ...f, scheduled_date: date }))
    try {
      const res = await dietApi.getKitchenAdmissions()
      if (res.data.success) setAdmissions(res.data.data ?? [])
    } catch {
      setAdmissions([])
      toast.error('Failed to load admissions for manual ordering')
    }
  }

  const submitManualMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addMealForm.admission_id) {
      toast.error('Select a patient/admission')
      return
    }
    setSubmittingMeal(true)
    try {
      const res = await dietApi.createManualMeal({
        admission_id: addMealForm.admission_id,
        meal_type: addMealForm.meal_type,
        scheduled_date: addMealForm.scheduled_date || undefined,
        special_instructions: addMealForm.special_instructions || undefined,
      })
      if (res.data.success) {
        toast.success('Meal order added')
        setShowAddMeal(false)
        load()
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to add meal order'
      toast.error(msg)
    } finally {
      setSubmittingMeal(false)
    }
  }

  const confirmCancelMeal = async () => {
    if (!cancelTarget) return
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required')
      return
    }
    setCancelling(true)
    try {
      const res = await dietApi.cancelMeal(cancelTarget.id, cancelReason.trim())
      if (res.data.success) {
        toast.success('Meal order cancelled')
        setCancelTarget(null)
        setCancelReason('')
        load()
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to cancel meal'
      toast.error(msg)
    } finally {
      setCancelling(false)
    }
  }

  const triggerGeneration = async () => {
    setGenerating(true)
    try {
      const res = await dietApi.generateDailyMeals(date)
      if (res.data.success) {
        toast.success(`Generated ${res.data.data.count} meal orders for ${date}`)
        load()
        loadWards()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to trigger meal orders generation')
    } finally {
      setGenerating(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await dietApi.updateMealStatus(id, status)
      toast.success(`Meal marked as ${status.toLowerCase()}`)
      load()
    } catch (err: any) {
      const msg = err.response?.data?.error || `Failed to mark as ${status.toLowerCase()}`
      toast.error(msg)
    }
  }

  // Local status view filter
  const filteredMeals = statusFilter
    ? meals.filter(m => m.status === statusFilter)
    : meals

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <ChefHat size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Kitchen & Diet Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage active IPD meals, schedules, and serving logs.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Can permission="diet.serve">
            <Button variant="secondary" onClick={openAddMeal}>
              <Plus size={14} className="mr-1.5 text-teal-600" />
              Add Meal
            </Button>
          </Can>
          <Can permission="diet.manage">
            <Button variant="secondary" onClick={triggerGeneration} disabled={generating}>
              <Play size={14} className="mr-1.5 text-orange-600" />
              {generating ? 'Generating...' : 'Generate Daily Meals'}
            </Button>
          </Can>
          <Button variant="ghost" onClick={load}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card rounded-2xl border border-border p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Date</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-9 w-40" />
          </div>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Meal Session</label>
          <select
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
            value={mealType}
            onChange={e => setMealType(e.target.value)}
          >
            <option value="">All Meals</option>
            {Object.keys(MEAL_TYPE_CONFIG).map(t => (
              <option key={t} value={t}>{MEAL_TYPE_CONFIG[t].label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Ward Filter {wardLoading && '(loading...)'}</label>
          <select
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
            value={wardFilter}
            onChange={e => setWardFilter(e.target.value)}
          >
            <option value="">All Wards</option>
            {wardOptions.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
          <select
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.keys(MEAL_STATUS_CONFIG).map(s => (
              <option key={s} value={s}>{MEAL_STATUS_CONFIG[s as MealOrder['status']].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ward-wise Kitchen Sheet */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading kitchen sheet...</div>
        ) : meals.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-16 text-center text-muted-foreground flex flex-col items-center gap-2">
            <ChefHat size={36} className="text-muted-foreground/40" />
            <h3 className="font-bold text-foreground">No meal orders found</h3>
            <p className="text-sm">Click "Generate Daily Meals" to prepare orders for today's active admissions.</p>
          </div>
        ) : (
          [...new Set(filteredMeals.map(m => m.ward_name))].map(wardName => {
            const wardMeals = filteredMeals.filter(m => m.ward_name === wardName)
            if (wardMeals.length === 0) return null
            return (
              <div key={wardName} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center">
                  <h2 className="font-bold text-foreground">{wardName}</h2>
                  <span className="text-xs text-muted-foreground font-semibold">{wardMeals.length} meals</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10 border-b border-border">
                      <tr>
                        {['Bed', 'Patient', 'Session', 'Diet Type', 'Pathya / Instructions', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {wardMeals.map(meal => {
                        const mcfg = MEAL_STATUS_CONFIG[meal.status]
                        const tcfg = MEAL_TYPE_CONFIG[meal.meal_type]
                        const hasAllergy = !!meal.patient_allergies
                        return (
                          <tr
                            key={meal.id}
                            className={`transition-colors ${hasAllergy ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-muted/10'}`}
                          >
                            <td className="px-5 py-4 font-mono font-bold text-teal-700">{meal.bed_no}</td>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-foreground">{meal.patient_name}</p>
                              <p className="text-xs text-muted-foreground">{meal.patient_uhid}</p>
                              {hasAllergy && (
                                <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                  <AlertCircle size={11} /> ALLERGY: {meal.patient_allergies}
                                </p>
                              )}
                              {!!meal.patient_chronic_diseases && (
                                <p className="mt-0.5 text-[10px] text-amber-700">Chronic: {meal.patient_chronic_diseases}</p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-bold ${tcfg?.color}`}>{tcfg?.label}</span>
                              <p className="text-[10px] text-muted-foreground">{tcfg?.time}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
                                {meal.diet_type}
                              </span>
                            </td>
                            <td className="px-5 py-4 max-w-[240px]">
                              {meal.pathya && <p className="text-xs text-slate-700"><span className="font-semibold text-emerald-700">Pathya:</span> {meal.pathya}</p>}
                              {meal.special_instructions && <p className="text-xs text-slate-600 italic mt-0.5">Notes: {meal.special_instructions}</p>}
                              {meal.status === 'CANCELLED' && meal.cancellation_reason && (
                                <p className="text-[10px] text-rose-600 mt-0.5">Reason: {meal.cancellation_reason}</p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide px-2 py-0.5 text-[10px] ${mcfg.bg} ${mcfg.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${mcfg.dot}`} />
                                {mcfg.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-1.5">
                                {meal.status === 'PENDING' && (
                                  <>
                                    <Button variant="secondary" onClick={() => updateStatus(meal.id, 'PREPARING')}>
                                      <ChefHat size={12} className="mr-1" /> Prepare
                                    </Button>
                                    <Button variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => updateStatus(meal.id, 'HELD')}>
                                      <AlertTriangle size={12} /> Hold
                                    </Button>
                                    <Button variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setCancelTarget(meal)}>
                                      <Ban size={12} /> Cancel
                                    </Button>
                                  </>
                                )}
                                {meal.status === 'PREPARING' && (
                                  <>
                                    <Button variant="primary" onClick={() => updateStatus(meal.id, 'READY')}>
                                      <CheckCircle2 size={12} className="mr-1" /> Ready
                                    </Button>
                                    <Button variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => updateStatus(meal.id, 'HELD')}>
                                      <AlertTriangle size={12} /> Hold
                                    </Button>
                                  </>
                                )}
                                {meal.status === 'READY' && (
                                  <Button variant="primary" onClick={() => updateStatus(meal.id, 'SERVED')}>
                                    <CheckCircle2 size={12} className="mr-1" /> Serve
                                  </Button>
                                )}
                                {meal.status === 'HELD' && (
                                  <Button variant="secondary" onClick={() => updateStatus(meal.id, 'PENDING')}>
                                    Reopen
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Manual Add Meal Modal */}
      {showAddMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-teal-600" />
                <h2 className="font-bold text-foreground">Add Manual Meal Order</h2>
              </div>
              <button onClick={() => setShowAddMeal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={submitManualMeal} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Patient (admission with active diet plan) *</label>
                <select
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
                  value={addMealForm.admission_id}
                  onChange={e => setAddMealForm(f => ({ ...f, admission_id: e.target.value }))}
                  required
                >
                  <option value="">Select patient</option>
                  {admissions.map(a => (
                    <option key={a.admission_id} value={a.admission_id}>
                      {a.patient_name} ({a.patient_uhid}) — {a.ward_name} / {a.bed_no} • {a.diet_type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Meal Session *</label>
                <select
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
                  value={addMealForm.meal_type}
                  onChange={e => setAddMealForm(f => ({ ...f, meal_type: e.target.value }))}
                >
                  {Object.keys(MEAL_TYPE_CONFIG).map(t => (
                    <option key={t} value={t}>{MEAL_TYPE_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Date</label>
                <Input
                  type="date"
                  value={addMealForm.scheduled_date}
                  onChange={e => setAddMealForm(f => ({ ...f, scheduled_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Special Instructions</label>
                <textarea
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm min-h-[70px]"
                  value={addMealForm.special_instructions}
                  onChange={e => setAddMealForm(f => ({ ...f, special_instructions: e.target.value }))}
                  placeholder="e.g., No onion/garlic, serve warm"
                />
              </div>
              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setShowAddMeal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={submittingMeal}>
                  {submittingMeal ? 'Adding...' : 'Add Meal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Meal Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-rose-600" />
                <h2 className="font-bold text-foreground">Cancel Meal Order</h2>
              </div>
              <button onClick={() => { setCancelTarget(null); setCancelReason('') }} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{cancelTarget.patient_name}</span> ({cancelTarget.bed_no}) —{' '}
                {MEAL_TYPE_CONFIG[cancelTarget.meal_type]?.label} on {new Date(cancelTarget.scheduled_date).toLocaleDateString()}
              </p>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Cancellation Reason *</label>
                <textarea
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm min-h-[70px]"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g., Patient NPO before procedure"
                />
              </div>
              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setCancelTarget(null); setCancelReason('') }}>Back</Button>
                <Button variant="danger" onClick={confirmCancelMeal} disabled={cancelling}>
                  {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
