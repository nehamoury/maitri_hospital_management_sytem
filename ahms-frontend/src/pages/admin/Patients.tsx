import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, Badge, Table, EmptyState, Spinner, PageHeader, Input, Button } from '../../components/ui'

interface Patient {
  id: string
  uhid: string
  full_name: string
  gender: string
  age: number
  mobile: string
  email: string
  is_active: boolean
  created_at: string
}

const ITEMS_PER_PAGE = 10

export default function Patients() {
  const [patients, setPatients] = useState<Patient[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
    api
      .get<{ data: Patient[] }>('/patients', { params: { search: query || undefined } })
      .then((res) => setPatients(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load patients')))
  }, [query])

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Register and manage patient records"
        action={
          <Can permission="patient.create">
            <Link to="/admin/patients/new">
              <Button>+ Register Patient</Button>
            </Link>
          </Can>
        }
      />
      <Card>
        <div className="border-b border-slate-200 p-4">
          <Input
            placeholder="Search by name, UHID, or mobile..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {error ? (
          <EmptyState message={error} />
        ) : !patients ? (
          <Spinner label="Loading patients..." />
        ) : patients.length === 0 ? (
          <EmptyState message="No patients found" />
        ) : (
          <>
            <Table headers={['UHID', 'Name', 'Gender', 'Age', 'Mobile', 'Status', '']}>
              {patients.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-emerald-700">{p.uhid}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.gender}</td>
                  <td className="px-4 py-3 text-slate-600">{p.age}</td>
                  <td className="px-4 py-3 text-slate-600">{p.mobile}</td>
                  <td className="px-4 py-3">
                    <Badge color={p.is_active ? 'green' : 'red'}>{p.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/patients/${p.id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-500">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, patients.length)} of {patients.length} patients
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="secondary" onClick={() => setPage(p => Math.min(Math.ceil(patients.length / ITEMS_PER_PAGE), p + 1))} disabled={page === Math.ceil(patients.length / ITEMS_PER_PAGE)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
