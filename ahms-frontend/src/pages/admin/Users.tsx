import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button, Input, Select, Field } from '../../components/ui'

interface User {
  id: string
  full_name: string
  email: string
  mobile: string
  role_id: string
  role_name: string
  role_display_name: string
  is_active: boolean
  created_at: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string
}

export default function Users() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    role_id: '',
    is_active: true,
  })

  const load = () => {
    api
      .get<{ data: User[] }>('/users')
      .then((res) => setUsers(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load staff users')))
  }

  useEffect(() => {
    load()
    api.get<{ data: Role[] }>('/roles').then((res) => setRoles(res.data.data || [])).catch(() => {})
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, {
          full_name: form.full_name,
          email: form.email,
          mobile: form.mobile,
          role_id: form.role_id,
          is_active: form.is_active,
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await api.post('/users', {
          full_name: form.full_name,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
          role_id: form.role_id,
        })
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ full_name: '', email: '', mobile: '', password: '', role_id: '', is_active: true })
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save staff user'))
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (u: User) => {
    setEditingId(u.id)
    setForm({
      full_name: u.full_name,
      email: u.email,
      mobile: u.mobile,
      password: '',
      role_id: u.role_id,
      is_active: u.is_active,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (id: string) => {
    if (!window.confirm('Deactivate this staff login? They will no longer be able to sign in.')) return
    setError('')
    try {
      await api.delete(`/users/${id}`)
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to deactivate user'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff Users"
        subtitle="Manage staff logins and roles"
        action={
          <Can permission="user.create">
            <Button
              onClick={() => {
                if (showForm) {
                  setEditingId(null)
                  setForm({ full_name: '', email: '', mobile: '', password: '', role_id: '', is_active: true })
                }
                setShowForm((v) => !v)
              }}
            >
              {showForm ? 'Close' : '+ Add Staff User'}
            </Button>
          </Can>
        }
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardHeader title={editingId ? 'Edit Staff User' : 'Add Staff User'} />
          <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Full Name *">
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </Field>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Mobile *">
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
            </Field>
            <Field label="Role *">
              <Select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} required>
                <option value="">Select role</option>
                {roles
                  .filter((r) => r.name !== 'PATIENT')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={editingId ? 'Reset Password' : 'Password *'} hint={editingId ? 'Leave blank to keep current password' : 'Minimum 8 characters — used for staff login'}>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} />
            </Field>
            {editingId && (
              <Field label="Status">
                <select
                  value={form.is_active ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring text-slate-800"
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">INACTIVE</option>
                </select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update User' : 'Add User'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {!users ? (
          <Spinner label="Loading staff users..." />
        ) : users.length === 0 ? (
          <EmptyState message="No staff users found" />
        ) : (
          <Table headers={['Name', 'Role', 'Email', 'Mobile', 'Status', 'Actions']}>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {u.role_display_name || u.role_name}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.mobile}</td>
                <td className="px-4 py-3">
                  <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Can permission="user.update">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => startEdit(u)}>
                      Edit
                    </Button>
                  </Can>
                  <Can permission="user.delete">
                    <Button variant="danger" className="px-3 py-1.5 text-xs font-semibold" onClick={() => remove(u.id)}>
                      Deactivate
                    </Button>
                  </Can>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}