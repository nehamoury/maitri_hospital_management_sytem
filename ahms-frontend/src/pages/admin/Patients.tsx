import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, Badge, Table, EmptyState, Spinner, PageHeader, Input, Button } from '../../components/ui'
import { Search, X, User } from 'lucide-react'

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
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle="Manage registered patients and their clinical charts."
        action={
          <Can permission="patient.create">
            <Link to="/admin/patients/new">
              <Button className="flex items-center gap-1.5 shadow-sm">
                <User className="h-4 w-4" /> Register Patient
              </Button>
            </Link>
          </Can>
        }
      />

      <Card>
        {/* Search input with icon */}
        <div className="relative border-b border-border p-4 bg-muted/10">
          <div className="pointer-events-none absolute inset-y-0 left-7 flex items-center pl-1">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Search by patient name, UHID, or mobile number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-7 flex items-center pr-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error ? (
          <EmptyState message={error} />
        ) : !patients ? (
          <Spinner label="Loading patient records..." />
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-semibold text-foreground">No patients found</p>
            <p className="text-xs text-muted-foreground mt-1">Try modifying your search query or registering a new patient.</p>
            {query && (
              <Button variant="secondary" onClick={() => setQuery('')} className="mt-4">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table headers={['UHID', 'Name', 'Gender', 'Age', 'Mobile', 'Status', '']}>
              {patients.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{p.uhid}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{p.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.gender}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.age}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.mobile}</td>
                  <td className="px-4 py-3">
                    <Badge color={p.is_active ? 'green' : 'red'}>{p.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/patients/${p.id}`} className="text-sm font-semibold text-primary hover:underline">
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/10">
              <span className="text-xs text-muted-foreground font-medium">
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
