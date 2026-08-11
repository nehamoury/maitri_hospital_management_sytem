import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, Badge, EmptyState, Spinner, PageHeader, Button } from '../../components/ui'

interface Encounter {
  id: string
  patient_id: string
  uhid: string
  patient_name: string
  department_name: string
  doctor_name: string
  encounter_type: string
  visit_type: string
  visit_date: string
  token_number: number
  status: string
}

interface DoctorGroup {
  doctorName: string
  department: string
  waiting: Encounter[]
  inConsult: Encounter | null
  completed: Encounter[]
}

export default function TokenBoard() {
  const [groups, setGroups] = useState<DoctorGroup[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const load = () => {
    api
      .get<{ data: Encounter[] }>('/encounters')
      .then((res) => {
        const todays = res.data.data.filter(
          (e) => e.encounter_type === 'OPD' && e.visit_date.slice(0, 10) === today,
        )
        const byDoctor = new Map<string, DoctorGroup>()
        for (const e of todays) {
          let g = byDoctor.get(e.doctor_name)
          if (!g) {
            g = { doctorName: e.doctor_name, department: e.department_name, waiting: [], inConsult: null, completed: [] }
            byDoctor.set(e.doctor_name, g)
          }
          if (e.status === 'IN_CONSULTATION') g.inConsult = e
          else if (e.status === 'COMPLETED') g.completed.push(e)
          else g.waiting.push(e)
        }
        const list = Array.from(byDoctor.values()).sort((a, b) =>
          a.department.localeCompare(b.department) || a.doctorName.localeCompare(b.doctorName),
        )
        list.forEach((g) => {
          g.waiting.sort((a, b) => a.token_number - b.token_number)
          g.completed.sort((a, b) => a.token_number - b.token_number)
        })
        setGroups(list)
        setLastUpdated(new Date())
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load token board')))
  }

  useEffect(() => {
    load()
    let timeout: ReturnType<typeof setTimeout>
    const handler = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => load(), 500)
    }
    window.addEventListener('appointment_updated', handler)
    window.addEventListener('encounter_updated', handler)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('appointment_updated', handler)
      window.removeEventListener('encounter_updated', handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = async (enc: Encounter, status: string) => {
    setBusyId(enc.id)
    try {
      await api.patch(`/encounters/${enc.id}/status`, { status })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update status'))
    } finally {
      setBusyId('')
    }
  }

  const TokenCard = ({ e, compact }: { e: Encounter; compact?: boolean }) => (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${
        e.status === 'IN_CONSULTATION'
          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xl font-bold text-slate-800">
          {e.token_number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={`/admin/patients/${e.patient_id}`} className="truncate font-medium text-slate-800 hover:text-emerald-700">
              {e.patient_name?.trim() ? e.patient_name : <span className="italic text-slate-400">Unnamed Patient</span>}
            </Link>
            {e.status === 'IN_CONSULTATION' && <Badge color="green">NOW SERVING</Badge>}
          </div>
          <div className="truncate text-xs text-slate-500 mt-0.5">
            {e.uhid ? <span className="mr-1 font-mono">{e.uhid}</span> : null}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">{e.visit_type}</span>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="flex shrink-0 items-center">
          {e.status === 'WAITING' || e.status === 'REGISTERED' ? (
            <Can permission="encounter.update">
              <Button className="whitespace-nowrap px-4 py-1.5 text-xs font-semibold shadow-sm" disabled={busyId === e.id} onClick={() => advance(e, 'IN_CONSULTATION')}>
                Start Consult
              </Button>
            </Can>
          ) : e.status === 'IN_CONSULTATION' ? (
            <Can permission="encounter.update">
              <Button variant="secondary" className="whitespace-nowrap px-4 py-1.5 text-xs font-semibold shadow-sm" disabled={busyId === e.id} onClick={() => advance(e, 'COMPLETED')}>
                Complete
              </Button>
            </Can>
          ) : (
            <Link to={`/admin/encounters/${e.id}/consultation`} className="whitespace-nowrap text-xs font-semibold text-emerald-700 hover:underline">
              View
            </Link>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Token Board"
        subtitle={`Live OPD queue for ${today}. Auto-refreshes on new appointments.`}
        action={
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-slate-500">Updated {lastUpdated.toLocaleTimeString()}</span>}
            <Button onClick={load}>Refresh</Button>
          </div>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!groups ? (
        <Card>
          <Spinner label="Loading token board..." />
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState message="No OPD encounters registered today" />
        </Card>
      ) : (
        <div className="grid gap-6">
          {groups.map((g) => (
            <Card key={g.doctorName} className="overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <div className="font-semibold text-slate-800 text-base">{g.doctorName}</div>
                <div className="text-sm text-slate-500">{g.department}</div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 min-h-[200px]">
                <div className="p-3">
                  <div className="px-1 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-amber-600">
                    Waiting ({g.waiting.length})
                  </div>
                  <div className="space-y-3">
                    {g.waiting.map((e) => (
                      <TokenCard key={e.id} e={e} />
                    ))}
                  </div>
                </div>
                <div className="bg-emerald-50/30 p-3">
                  <div className="px-1 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    In Consultation
                  </div>
                  <div className="space-y-3">
                    {g.inConsult ? (
                      <TokenCard e={g.inConsult} />
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white/50 p-4 text-center text-sm text-slate-400">
                        No active token
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <div className="px-1 pb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Completed ({g.completed.length})
                  </div>
                  <div className="space-y-3">
                    {g.completed.slice(0, 6).map((e) => (
                      <TokenCard key={e.id} e={e} compact />
                    ))}
                    {g.completed.length > 6 && (
                      <div className="text-center text-xs text-slate-500 font-medium">…and {g.completed.length - 6} more</div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <Badge color="amber">Waiting</Badge>
        <Badge color="blue">In Consultation</Badge>
        <Badge color="green">Completed</Badge>
      </div>
    </div>
  )
}