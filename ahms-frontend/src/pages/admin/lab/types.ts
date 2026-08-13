import type { LabOrder, LabOrderItem, LabOrderListItem, LabCategory, LabTest } from '@/lib/api'

export type { LabOrder, LabOrderItem, LabOrderListItem, LabCategory, LabTest }

export const LAB_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ORDERED:           { label: 'Ordered',          bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  SAMPLE_COLLECTED:  { label: 'Sample Collected',  bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  PROCESSING:        { label: 'Processing',        bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
  RESULT_AVAILABLE:  { label: 'Result Available',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  DOCTOR_REVIEWED:   { label: 'Doctor Reviewed',   bg: 'bg-teal-50',    text: 'text-teal-700',   dot: 'bg-teal-500' },
  CANCELLED:         { label: 'Cancelled',         bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400' },
  REJECTED:          { label: 'Rejected',          bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
}

export const ITEM_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:        { label: 'Pending',        color: 'text-slate-500' },
  PROCESSING:     { label: 'Processing',     color: 'text-orange-600' },
  RESULT_ENTERED: { label: 'Result Entered', color: 'text-blue-600' },
  VERIFIED:       { label: 'Verified',       color: 'text-emerald-600' },
  CANCELLED:      { label: 'Cancelled',      color: 'text-slate-400' },
}

export const FLAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NORMAL:   { label: 'Normal',   color: 'text-emerald-700', bg: 'bg-emerald-50' },
  LOW:      { label: 'Low ↓',    color: 'text-amber-700',   bg: 'bg-amber-50' },
  HIGH:     { label: 'High ↑',   color: 'text-red-700',     bg: 'bg-red-50' },
  CRITICAL: { label: 'Critical', color: 'text-red-800',     bg: 'bg-red-100' },
}

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  ROUTINE: { label: 'Routine', color: 'text-slate-600' },
  URGENT:  { label: 'Urgent',  color: 'text-amber-600' },
  STAT:    { label: 'STAT',    color: 'text-red-600' },
}
