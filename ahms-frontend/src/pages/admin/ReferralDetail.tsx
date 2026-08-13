import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, EmptyState, Spinner, PageHeader, Button } from '../../components/ui'

interface SourceEncounter {
  encounter_id: string
  visit_date: string
  department_name: string
  doctor_name: string
  consultations?: {
    consultation_id: string
    chief_complaints: string
    history: string
    examination: string
    clinical_notes: string
    treatment_plan: string
    diagnoses: { diagnosis: string; diagnosis_type: string; notes: string }[]
  }[]
  diagnoses?: { diagnosis: string; diagnosis_type: string; notes: string }[]
  prescriptions?: {
    prescription_id: string
    status: string
    items: { medicine: string; dose: string; frequency: string; duration: string; quantity: number; dispensed_qty: number }[]
  }[]
}

interface Referral {
  id: string
  referral_no: string
  patient_id: string
  uhid: string
  patient_name: string
  from_department: string
  to_department: string
  preferred_doctor: string
  reason: string
  clinical_notes: string
  priority: string
  recommended_treatment: string
  diagnosis: string
  status: string
  referred_by: string
  referred_at: string
  source_encounter?: SourceEncounter
}

const priorityColor = (p: string) => (p === 'EMERGENCY' ? 'red' : p === 'URGENT' ? 'amber' : 'blue')
const statusColor = (s: string) =>
  s === 'COMPLETED' ? 'green' : s === 'REJECTED' || s === 'CANCELLED' ? 'red' : s === 'ACCEPTED' || s === 'CONSULTATION_STARTED' ? 'blue' : 'amber'

export default function ReferralDetail() {
  const { id } = useParams()
  const [ref, setRef] = useState<Referral | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => {
    api
      .get<{ data: Referral }>(`/referrals/${id}`)
      .then((res) => setRef(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load referral')))
  }

  useEffect(load, [id])

  const updateStatus = async (status: string) => {
    setLoading(true)
    setError('')
    try {
      await api.patch(`/referrals/${id}/status`, { status })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update status'))
    } finally {
      setLoading(false)
    }
  }

  if (error) return <EmptyState message={error} />
  if (!ref) return <Spinner label="Loading referral..." />

  const src = ref.source_encounter

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={ref.referral_no}
        subtitle={
          <div className="flex items-center gap-1.5">
            <span>Patient:</span>
            <Link to={`/admin/patients/${ref.patient_id}`} className="font-semibold text-emerald-700 hover:underline">
              {ref.patient_name} ({ref.uhid})
            </Link>
          </div>
        }
        action={<Badge color={statusColor(ref.status)}>{ref.status}</Badge>}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card className="mb-6">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-400">From</p>
            <p className="text-sm font-medium text-slate-800">{ref.from_department}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">To</p>
            <p className="text-sm font-medium text-slate-800">{ref.to_department}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Referred By</p>
            <p className="text-sm font-medium text-slate-800">{ref.referred_by}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Priority</p>
            <Badge color={priorityColor(ref.priority)}>{ref.priority}</Badge>
          </div>
          {ref.preferred_doctor && (
            <div>
              <p className="text-xs uppercase text-slate-400">Preferred Doctor</p>
              <p className="text-sm font-medium text-slate-800">{ref.preferred_doctor}</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase text-slate-400">Date</p>
            <p className="text-sm font-medium text-slate-800">{new Date(ref.referred_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="space-y-2 border-t border-slate-200 p-5">
          <p className="text-sm text-slate-700">
            <span className="font-medium">Reason:</span> {ref.reason}
          </p>
          {ref.diagnosis && (
            <p className="text-sm text-slate-700">
              <span className="font-medium">Diagnosis:</span> {ref.diagnosis}
            </p>
          )}
          {ref.clinical_notes && (
            <p className="text-sm text-slate-700">
              <span className="font-medium">Clinical Notes:</span> {ref.clinical_notes}
            </p>
          )}
          {ref.recommended_treatment && (
            <p className="text-sm text-slate-700">
              <span className="font-medium">Recommended Treatment:</span> {ref.recommended_treatment}
            </p>
          )}
        </div>
        {ref.status !== 'COMPLETED' && ref.status !== 'REJECTED' && ref.status !== 'CANCELLED' && (
          <Can permission="referral.update">
            <div className="flex flex-wrap gap-2 border-t border-slate-200 p-5">
              {ref.status === 'CREATED' && (
                <Button onClick={() => updateStatus('RECEIVED')} disabled={loading}>
                  Mark Received
                </Button>
              )}
              {ref.status === 'RECEIVED' && (
                <Button onClick={() => updateStatus('ACCEPTED')} disabled={loading}>
                  Accept
                </Button>
              )}
              {ref.status === 'ACCEPTED' && (
                <Button onClick={() => updateStatus('CONSULTATION_STARTED')} disabled={loading}>
                  Start Consultation
                </Button>
              )}
              {ref.status === 'CONSULTATION_STARTED' && (
                <Button onClick={() => updateStatus('COMPLETED')} disabled={loading}>
                  Complete
                </Button>
              )}
              <Button variant="danger" onClick={() => updateStatus('REJECTED')} disabled={loading}>
                Reject
              </Button>
            </div>
          </Can>
        )}
      </Card>

      {src && (
        <Card>
          <CardHeader
            title="Source Encounter History"
            subtitle={`${new Date(src.visit_date).toLocaleDateString()} • ${src.department_name} • ${src.doctor_name}`}
            action={
              <Link to={`/admin/encounters/${src.encounter_id}/consultation`}>
                <Button variant="secondary" className="text-xs">
                  Open Encounter
                </Button>
              </Link>
            }
          />
          <div className="space-y-4 p-5">
            {(src.consultations ?? []).map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Consultation</p>
                {c.chief_complaints && (
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">Complaints:</span> {c.chief_complaints}
                  </p>
                )}
                {c.treatment_plan && (
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">Plan:</span> {c.treatment_plan}
                  </p>
                )}
                {c.diagnoses && c.diagnoses.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.diagnoses.map((d, j) => (
                      <Badge key={j} color="purple">
                        {d.diagnosis_type}: {d.diagnosis}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {(src.prescriptions ?? []).map((rx, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Prescription</p>
                  <Badge color={rx.status === 'DISPENSED' ? 'green' : 'blue'}>{rx.status}</Badge>
                </div>
                <table className="mt-2 w-full text-sm whitespace-nowrap">
                  <tbody>
                    {rx.items.map((it, j) => (
                      <tr key={j} className="border-t border-slate-100">
                        <td className="py-1.5 pr-4 font-medium text-slate-700">{it.medicine}</td>
                        <td className="py-1.5 pr-4 text-slate-600">{it.dose}</td>
                        <td className="py-1.5 pr-4 text-slate-600">{it.frequency}</td>
                        <td className="py-1.5 pr-4 text-slate-600">{it.duration}</td>
                        <td className="py-1.5 text-slate-600">
                          {it.dispensed_qty}/{it.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
