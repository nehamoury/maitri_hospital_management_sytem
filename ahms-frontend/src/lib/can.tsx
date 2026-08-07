/* oxlint-disable react/only-export-components -- hook + component co-located */
import type { ReactNode } from 'react'
import { useAuth } from './auth'

export function useCan() {
  const { user } = useAuth()
  const permissions = user?.permissions ?? []

  const can = (permission: string | string[]) => {
    const required = Array.isArray(permission) ? permission : [permission]
    return required.every((p) => permissions.includes(p))
  }

  return { can, permissions }
}

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string | string[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { can } = useCan()
  return can(permission) ? <>{children}</> : <>{fallback}</>
}

export function PermissionGate({
  permission,
  children,
}: {
  permission: string | string[]
  children: ReactNode
}) {
  const { can } = useCan()
  if (!can(permission)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="text-4xl font-bold text-teal-700">403</div>
        <p className="text-sm text-slate-500">
          You do not have permission to access this page.
        </p>
      </div>
    )
  }
  return <>{children}</>
}