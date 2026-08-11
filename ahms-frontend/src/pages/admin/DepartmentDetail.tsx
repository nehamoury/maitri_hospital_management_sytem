import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Card, CardHeader, Badge, Spinner, PageHeader, Button, Table } from '../../components/ui'
import { ArrowLeft } from 'lucide-react'

interface Department {
  id: string
  code: string
  name: string
  type: string
  description: string
  default_fee: number
  is_active: boolean
  created_at: string
}

interface Doctor {
  id: string
  full_name: string
  department_id: string
  mobile?: string
  email?: string
  consultation_fee?: number
  is_active: boolean
}

export default function DepartmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [department, setDepartment] = useState<Department | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        setLoading(true)
        const [deptRes, docsRes] = await Promise.all([
          api.get<{ data: Department }>(`/departments/${id}`),
          api.get<{ data: Doctor[] }>('/doctors')
        ])
        setDepartment(deptRes.data.data)
        // Filter doctors by this department
        setDoctors((docsRes.data.data || []).filter(d => d.department_id === id))
      } catch (err) {
        setError(errorMessage(err, 'Failed to load department details'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <Spinner label="Loading department details..." />
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!department) return <div className="p-4 text-slate-500">Department not found.</div>

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" className="px-3 py-1.5 text-xs text-slate-500 flex items-center gap-2" onClick={() => navigate('/admin/departments')}>
          <ArrowLeft className="h-4 w-4" /> Back to Departments
        </Button>
      </div>

      <PageHeader
        title={department.name}
        subtitle="Department Details & Assigned Doctors"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Department Info */}
        <div className="md:col-span-1">
          <Card className="border-teal-100 bg-teal-50/5">
            <CardHeader title="Department Information" />
            <div className="p-5 grid gap-4 text-sm text-slate-700">
              <p><strong>Code:</strong> <code className="bg-slate-100 px-2 py-0.5 border rounded font-semibold text-teal-700">{department.code || '—'}</code></p>
              <p><strong>Type:</strong> {department.type || '—'}</p>
              <p><strong>Base Consultation Fee:</strong> ₹{department.default_fee || 0}</p>
              <p><strong>Status:</strong> <Badge color={department.is_active ? 'green' : 'red'}>{department.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge></p>
              <p><strong>Description:</strong> {department.description || '—'}</p>
              <p><strong>Created At:</strong> {new Date(department.created_at).toLocaleString()}</p>
            </div>
          </Card>
        </div>

        {/* Assigned Doctors */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader title={`Assigned Doctors (${doctors.length})`} />
            {doctors.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No doctors assigned to this department yet.
              </div>
            ) : (
              <Table headers={['Name', 'Mobile', 'Email', 'Consultation Fee', 'Status']}>
                {doctors.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{doc.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.mobile || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.email || '—'}</td>
                    <td className="px-4 py-3 text-teal-700 font-semibold">
                      {doc.consultation_fee ? `₹${doc.consultation_fee}` : <span className="text-slate-400 text-xs italic">Default (₹{department.default_fee})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={doc.is_active ? 'green' : 'red'}>{doc.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
