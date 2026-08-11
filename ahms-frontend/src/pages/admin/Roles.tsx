import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Card, CardHeader, Badge, Table, EmptyState, Spinner, PageHeader, Button } from '../../components/ui'

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  permissions: { id: string; name: string }[]
}

interface Permission {
  id: string
  name: string
  description: string
  selected: boolean
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [error, setError] = useState('')
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [catalog, setCatalog] = useState<Permission[]>([])
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const load = () => {
    api
      .get<{ data: Role[] }>('/roles')
      .then((res) => setRoles(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load roles')))
  }

  useEffect(() => {
    load()
  }, [])

  const startEdit = async (role: Role) => {
    setEditingRole(role)
    setError('')
    try {
      const { data } = await api.get<{ data: Permission[] }>('/permissions', { params: { role_id: role.id } })
      setCatalog(data.data || [])
      setSelectedSet(new Set((data.data || []).filter((p) => p.selected).map((p) => p.name)))
    } catch (err) {
      setError(errorMessage(err, 'Failed to load permission catalog'))
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggle = (name: string) => {
    const next = new Set(selectedSet)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setSelectedSet(next)
  }

  const save = async () => {
    if (!editingRole) return
    setLoading(true)
    setError('')
    try {
      await api.put(`/roles/${editingRole.id}/permissions`, { permissions: Array.from(selectedSet) })
      setEditingRole(null)
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update role permissions'))
    } finally {
      setLoading(false)
    }
  }

  const groupLabel = (name: string) => {
    const module = name.split('.')[0] || 'other'
    return module.charAt(0).toUpperCase() + module.slice(1)
  }

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Role-based access control" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {editingRole && (
        <Card className="mb-6">
          <CardHeader
            title={`Edit ${editingRole.display_name}`}
            subtitle="Tick the permissions this role should hold — changes apply immediately"
            action={
              <div className="flex gap-2">
                <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setEditingRole(null)}>
                  Cancel
                </Button>
                <Button className="px-3 py-1.5 text-xs" disabled={loading} onClick={save}>
                  {loading ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            }
          />
          <div className="grid gap-6 p-5 lg:grid-cols-3">
            {['patient', 'appointment', 'encounter', 'consultation', 'prescription', 'referral', 'pharmacy', 'billing', 'doctor', 'department', 'treatment', 'user', 'role', 'audit', 'dashboard', 'clinical', 'inventory', 'config', 'reports'].map((mod) => {
              const perms = catalog.filter((p) => p.name.startsWith(mod + '.') || p.name === mod)
              if (perms.length === 0 && mod !== 'clinical' && mod !== 'inventory') return null
              const count = perms.filter((p) => selectedSet.has(p.name)).length
              return (
                <div key={mod} className="rounded-xl border border-border/80 bg-muted/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{groupLabel(mod)}</p>
                    <span className="text-[10px] font-semibold text-slate-500">{count}/{perms.length}</span>
                  </div>
                  <div className="space-y-1">
                    {perms.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(p.name)}
                          onChange={() => toggle(p.name)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-emerald-700 focus:ring-emerald-600"
                        />
                        <span className="leading-tight">
                          <span className="block font-mono text-xs font-medium text-slate-700">{p.name}</span>
                          <span className="block text-[11px] text-slate-400">{p.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        {!roles ? (
          <Spinner label="Loading roles..." />
        ) : roles.length === 0 ? (
          <EmptyState message="No roles found" />
        ) : (
          <Table headers={['Role', 'Description', 'Permissions', 'Actions']}>
            {roles.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.display_name}
                  <p className="font-mono text-[11px] text-slate-400">{r.name}</p>
                </td>
                <td className="px-4 py-3 text-slate-600 text-sm">{r.description}</td>
                <td className="px-4 py-3">
                  <Badge color="blue">{r.permissions.length} permissions</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="secondary" className="px-3 py-1.5 text-xs font-semibold" onClick={() => startEdit(r)}>
                    Edit Permissions
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}