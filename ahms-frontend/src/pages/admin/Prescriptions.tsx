import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, errorMessage, openPrescriptionPrint } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, EmptyState, Spinner, PageHeader, Button, Input, Field } from '../../components/ui'

interface RxItem {
  medicine: string
  formulation: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  anupana: string
  route: string
  instructions: string
  dispensed_qty: number
}

interface Prescription {
  id: string
  encounter_id: string
  doctor_name: string
  status: string
  notes: string
  items: RxItem[]
  created_at: string
}

const emptyItem = (): Omit<RxItem, 'dispensed_qty'> => ({
  medicine: '',
  formulation: '',
  dose: '',
  frequency: '',
  duration: '',
  quantity: 1,
  anupana: '',
  route: '',
  instructions: '',
})

export default function Prescriptions() {
  const { id } = useParams()
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([emptyItem()])

  const load = () => {
    api
      .get<{ data: Prescription }>(`/encounters/${id}/prescriptions`)
      .then((res) => {
        setPrescription(res.data.data)
        setError('')
      })
      .catch(() => {
        setPrescription(null)
      })
      .finally(() => setLoaded(true))
  }

  useEffect(load, [id])

  const setItem = (i: number, key: string, value: string | number) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)))

  const addItem = () => setItems((arr) => [...arr, emptyItem()])
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i))

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const clean = items
        .filter((it) => it.medicine.trim())
        .map((it) => ({ ...it, quantity: Number(it.quantity) || 1 }))
      await api.post(`/encounters/${id}/prescriptions`, { notes, items: clean })
      setShowForm(false)
      setNotes('')
      setItems([emptyItem()])
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to create prescription'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Prescriptions"
        subtitle={`Encounter ${id?.slice(0, 8)}`}
        action={
          <div className="flex gap-2 print:hidden">
            <Link to={`/admin/encounters/${id}/consultation`}>
              <Button variant="secondary">Consultation</Button>
            </Link>
            <Can permission="prescription.print">
              <Button variant="secondary" onClick={() => prescription && openPrescriptionPrint(prescription.id)}>Print</Button>
            </Can>
            <Can permission="prescription.create">
              <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ New Prescription'}</Button>
            </Can>
          </div>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="New Prescription" />
          <form onSubmit={create} className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                    <th className="px-3 py-2">Medicine *</th>
                    <th className="px-3 py-2">Formulation</th>
                    <th className="px-3 py-2">Dose</th>
                    <th className="px-3 py-2">Frequency</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Anupana</th>
                    <th className="px-3 py-2">Instructions</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <Input value={it.medicine} onChange={(e) => setItem(i, 'medicine', e.target.value)} placeholder="e.g. Triphala" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={it.formulation} onChange={(e) => setItem(i, 'formulation', e.target.value)} placeholder="Churna" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={it.dose} onChange={(e) => setItem(i, 'dose', e.target.value)} placeholder="5g" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={it.frequency} onChange={(e) => setItem(i, 'frequency', e.target.value)} placeholder="BD" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={it.duration} onChange={(e) => setItem(i, 'duration', e.target.value)} placeholder="10 days" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} className="w-20" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={it.anupana} onChange={(e) => setItem(i, 'anupana', e.target.value)} placeholder="Warm water" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={it.instructions} onChange={(e) => setItem(i, 'instructions', e.target.value)} placeholder="e.g. Empty stomach" />
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(i)} className="text-sm text-red-500 hover:underline">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Field label="Prescription Notes / General Description">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add overall notes, dietary advice or instructions here..." />
            </Field>

            <div className="flex items-center justify-between">
              <Button type="button" variant="secondary" onClick={addItem}>
                + Add Item
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Prescription'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!loaded ? (
        <Spinner label="Loading prescriptions..." />
      ) : !prescription ? (
        <Card>
          <EmptyState message="No prescription for this encounter" />
        </Card>
      ) : (
        <Card key={prescription.id}>
          <CardHeader
            title={`By ${prescription.doctor_name}`}
            subtitle={new Date(prescription.created_at).toLocaleString()}
            action={
              <Badge color={prescription.status === 'DISPENSED' ? 'green' : prescription.status === 'PARTIALLY_DISPENSED' ? 'amber' : 'blue'}>
                {prescription.status}
              </Badge>
            }
          />
          <div className="overflow-x-auto p-5">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-1 pr-4">Medicine</th>
                  <th className="py-1 pr-4">Dose</th>
                  <th className="py-1 pr-4">Frequency</th>
                  <th className="py-1 pr-4">Duration</th>
                  <th className="py-1 pr-4">Anupana</th>
                  <th className="py-1 pr-4">Instructions</th>
                  <th className="py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {prescription.items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-700">
                      {it.medicine}
                      {it.formulation && <span className="text-slate-400"> ({it.formulation})</span>}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{it.dose}</td>
                    <td className="py-2 pr-4 text-slate-600">{it.frequency}</td>
                    <td className="py-2 pr-4 text-slate-600">{it.duration}</td>
                    <td className="py-2 pr-4 text-slate-600">{it.anupana}</td>
                    <td className="py-2 pr-4 text-slate-600">{it.instructions || '-'}</td>
                    <td className="py-2 text-slate-600">
                      {it.dispensed_qty}/{it.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prescription.notes && (
            <div className="border-t border-slate-100 bg-slate-50 p-5 rounded-b-lg">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Prescription Notes / Description</span>
              <p className="text-sm text-slate-700 font-sans whitespace-pre-wrap">{prescription.notes}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
