export interface DietPlan {
  id: string
  admission_id: string
  patient_id: string
  diet_type: string
  pathya: string
  apathya: string
  special_instructions: string
  start_date: string
  end_date: string
  is_active: boolean
  ordered_by_name: string
  cancelled_by_user_id?: string
  cancelled_by_name?: string
  cancelled_at?: string
  cancellation_reason?: string
  created_at: string
}

export type MealOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'HELD' | 'CANCELLED'

export interface MealOrder {
  id: string
  diet_plan_id: string
  admission_id: string
  patient_id: string
  patient_name: string
  patient_uhid: string
  ward_name: string
  bed_no: string
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS'
  scheduled_date: string
  status: MealOrderStatus
  prepared_at?: string
  prepared_by_name?: string
  ready_at?: string
  ready_by_name?: string
  served_at?: string
  served_by_name?: string
  remarks?: string
  diet_type: string
  pathya?: string
  apathya?: string
  special_instructions?: string
  patient_allergies?: string
  patient_chronic_diseases?: string
  cancelled_at?: string
  cancelled_by_name?: string
  cancellation_reason?: string
}

export interface DietTemplate {
  id: string
  name: string
  pathya: string
  apathya: string
  special_instructions: string
  is_active: boolean
  created_by_name: string
  created_at: string
}

export interface WardOption {
  id: string
  code: string
  name: string
}

export interface KitchenAdmission {
  admission_id: string
  admission_no: string
  patient_id: string
  patient_name: string
  patient_uhid: string
  ward_id: string
  ward_name: string
  bed_no: string
  diet_plan_id: string
  diet_type: string
  special_instructions?: string
  pathya?: string
  apathya?: string
}

export const MEAL_STATUS_CONFIG: Record<MealOrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:   { label: 'Pending',    bg: 'bg-slate-100',  text: 'text-slate-700',   dot: 'bg-slate-400' },
  PREPARING: { label: 'Preparing',  bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  READY:     { label: 'Ready',      bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  SERVED:    { label: 'Served',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  HELD:      { label: 'Held',       bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  CANCELLED: { label: 'Cancelled',  bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500' },
}

export const MEAL_TYPE_CONFIG: Record<string, { label: string; time: string; color: string }> = {
  BREAKFAST: { label: 'Breakfast', time: '07:30 AM', color: 'text-amber-600' },
  LUNCH:     { label: 'Lunch',     time: '12:30 PM', color: 'text-blue-600' },
  DINNER:    { label: 'Dinner',    time: '07:30 PM', color: 'text-indigo-600' },
  SNACKS:    { label: 'Snacks',    time: '04:30 PM', color: 'text-orange-600' },
}
