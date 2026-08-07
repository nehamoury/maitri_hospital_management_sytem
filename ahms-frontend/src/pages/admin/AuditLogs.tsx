import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Card, Table, EmptyState, Spinner, PageHeader, Input } from '../../components/ui'

interface AuditEntry {
  id: string
  user_id: string
  user_name: string
  action: string
  entity_type: string
  entity_id: string
  ip_address: string
  created_at: string
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')
  const [entity, setEntity] = useState('')
  const [entityId, setEntityId] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const params: Record<string, string> = {}
    if (entity) params.entity = entity
    if (entityId) params.id = entityId
    if (userId) params.user = userId
    api
      .get<{ data: AuditEntry[] }>('/audit-logs', { params })
      .then((res) => setLogs(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load audit logs')))
  }, [entity, entityId, userId])

  const actionColor = (a: string) =>
    a.startsWith('auth') ? 'bg-purple-100 text-purple-700' : a.includes('.create') ? 'bg-emerald-100 text-emerald-800' : a.includes('.update') || a.includes('_status') || a.includes('.payment') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Trail of all system changes" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card className="mb-4">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value)
              setEntityId('')
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All entity types</option>
            {['patient', 'appointment', 'encounter', 'consultation', 'prescription', 'referral', 'inventory', 'bill'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input placeholder="Entity ID" value={entityId} onChange={(e) => setEntityId(e.target.value)} disabled={!entity} />
          <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
      </Card>

      <Card>
        {!logs ? (
          <Spinner label="Loading audit logs..." />
        ) : logs.length === 0 ? (
          <EmptyState message="No audit entries found" />
        ) : (
          <Table headers={['Time', 'User', 'Action', 'Entity', 'IP']}>
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">{l.user_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColor(l.action)}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {l.entity_type}
                  {l.entity_id && <span className="ml-1 font-mono text-xs text-slate-400">{l.entity_id.slice(0, 8)}</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{l.ip_address}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
