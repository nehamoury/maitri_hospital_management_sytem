import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Card, Badge, Table, EmptyState, Spinner, PageHeader, Button, Textarea, Field } from '../../components/ui'

interface Session {
  id: string
  session_number: number
  session_date: string
  status: string
  before_condition?: string
  after_condition?: string
  complications?: string
  observations?: string
  notes?: string
  started_at?: string
  completed_at?: string
}

interface PlanSession {
  id: string
  plan_no: string
  patient_name: string
  patient_uh_id: string
  procedure_name: string
  status: string
  sessions: Session[]
}

const planStatusColor = (s: string) =>
  s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : s === 'IN_PROGRESS' ? 'blue' : 'amber'

export default function TreatmentSessions() {
  const [plans, setPlans] = useState<PlanSession[] | null>(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState<{ session: Session; plan: PlanSession } | null>(null)
  const [mode, setMode] = useState<'start' | 'complete'>('start')
  const [form, setForm] = useState({ before_condition: '', after_condition: '', complications: '', observations: '', notes: '' })

  const load = () => {
    api
      .get<{ data: PlanSession[] }>('/treatment-sessions/today')
      .then((res) => setPlans(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load today\'s sessions')))
  }

  useEffect(() => {
    load()
  }, [])

  const openAction = (session: Session, plan: PlanSession, m: 'start' | 'complete') => {
    setMode(m)
    setForm({
      before_condition: session.before_condition || '',
      after_condition: session.after_condition || '',
      complications: session.complications || '',
      observations: session.observations || '',
      notes: session.notes || '',
    })
    setActive({ session, plan })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!active) return
    setError('')
    try {
      if (mode === 'start') {
        await api.post(`/treatment-sessions/${active.session.id}/start`, {
          before_condition: form.before_condition,
          notes: form.notes,
        })
      } else {
        await api.post(`/treatment-sessions/${active.session.id}/complete`, {
          after_condition: form.after_condition,
          complications: form.complications,
          observations: form.observations,
          notes: form.notes,
        })
      }
      setActive(null)
      load()
    } catch (err) {
      setError(errorMessage(err, `Failed to ${mode} session`))
    }
  }

  const skip = async (id: string, reason: string) => {
    if (!window.confirm('Skip this session?')) return
    try {
      await api.post(`/treatment-sessions/${id}/skip`, { reason })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to skip session'))
    }
  }

  const allSessions = (plans ?? []).flatMap((p) => p.sessions.map((s) => ({ session: s, plan: p })))
  const pending = allSessions.filter((x) => x.session.status === 'PENDING')
  const inProgress = allSessions.filter((x) => x.session.status === 'IN_PROGRESS')
  const completed = allSessions.filter((x) => x.session.status === 'COMPLETED' || x.session.status === 'SKIPPED')

  const Row = ({ item, showActions }: { item: { session: Session; plan: PlanSession }; showActions: boolean }) => (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <span className="font-medium text-slate-800">{item.plan.patient_name}</span>
        <span className="ml-1 font-mono text-xs text-slate-400">{item.plan.patient_uh_id}</span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-emerald-700">{item.plan.plan_no}</td>
      <td className="px-4 py-3 text-slate-600">{item.plan.procedure_name}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-500">#{item.session.session_number}</td>
      <td className="px-4 py-3 text-slate-600">{item.session.session_date}</td>
      <td className="px-4 py-3">
        <Badge color={item.session.status === 'IN_PROGRESS' ? 'blue' : item.session.status === 'PENDING' ? 'slate' : 'green'}>
          {item.session.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {showActions && (
          <div className="flex justify-end gap-2">
            {item.session.status === 'PENDING' && (
              <>
                <Button variant="secondary" onClick={() => openAction(item.session, item.plan, 'start')}>
                  Start
                </Button>
                <Button variant="ghost" onClick={() => skip(item.session.id, 'cancelled by patient')}>
                  Skip
                </Button>
              </>
            )}
            {item.session.status === 'IN_PROGRESS' && (
              <Button onClick={() => openAction(item.session, item.plan, 'complete')}>Complete</Button>
            )}
          </div>
        )}
        {!showActions && item.session.after_condition && (
          <span className="text-xs text-slate-500">{item.session.after_condition}</span>
        )}
      </td>
    </tr>
  )

  return (
    <div>
      <PageHeader title="Today's Sessions" subtitle="Your assigned therapy sessions for today" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!plans ? (
        <Spinner label="Loading today's sessions..." />
      ) : allSessions.length === 0 ? (
        <Card>
          <EmptyState message="No sessions scheduled for you today" />
        </Card>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <Card>
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: "'Poppins', sans-serif" }}>In Progress</h2>
              </div>
              <Table headers={['Patient', 'Plan', 'Procedure', 'Session', 'Date', 'Status', '']}>
                {inProgress.map((x) => (
                  <Row key={x.session.id} item={x} showActions />
                ))}
              </Table>
            </Card>
          )}

          {pending.length > 0 && (
            <Card>
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: "'Poppins', sans-serif" }}>Pending</h2>
              </div>
              <Table headers={['Patient', 'Plan', 'Procedure', 'Session', 'Date', 'Status', '']}>
                {pending.map((x) => (
                  <Row key={x.session.id} item={x} showActions />
                ))}
              </Table>
            </Card>
          )}

          {completed.length > 0 && (
            <Card>
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: "'Poppins', sans-serif" }}>Completed</h2>
              </div>
              <Table headers={['Patient', 'Plan', 'Procedure', 'Session', 'Date', 'Status', 'Outcome']}>
                {completed.map((x) => (
                  <Row key={x.session.id} item={x} showActions={false} />
                ))}
              </Table>
            </Card>
          )}

          {plans.map((p) => p.status === 'APPROVED' || p.status === 'IN_PROGRESS' ? (
            <div key={p.id} className="sr-only">
              <Badge color={planStatusColor(p.status)}>{p.status}</Badge>
            </div>
          ) : null)}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {mode === 'start' ? 'Start Session' : 'Complete Session'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {active.plan.patient_name} · {active.plan.procedure_name} · Session #{active.session.session_number}
                </p>
              </div>
              <button onClick={() => setActive(null)} className="rounded-xl px-3 py-1.5 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>
            <form onSubmit={submit} className="grid gap-4 p-6">
              {mode === 'start' ? (
                <>
                  <Field label="Before Condition">
                    <Textarea
                      value={form.before_condition}
                      onChange={(e) => setForm({ ...form, before_condition: e.target.value })}
                      placeholder="Patient's condition before the session"
                    />
                  </Field>
                  <Field label="Notes">
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="After Condition">
                    <Textarea
                      value={form.after_condition}
                      onChange={(e) => setForm({ ...form, after_condition: e.target.value })}
                      placeholder="Patient's condition after the session"
                    />
                  </Field>
                  <Field label="Complications">
                    <Textarea
                      value={form.complications}
                      onChange={(e) => setForm({ ...form, complications: e.target.value })}
                      placeholder="Any complications (if none, write 'none')"
                    />
                  </Field>
                  <Field label="Observations">
                    <Textarea
                      value={form.observations}
                      onChange={(e) => setForm({ ...form, observations: e.target.value })}
                      placeholder="Observations, tolerance, response"
                    />
                  </Field>
                  <Field label="Notes">
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes" />
                  </Field>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setActive(null)}>
                  Cancel
                </Button>
                <Button type="submit">{mode === 'start' ? 'Start Session' : 'Complete Session'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
