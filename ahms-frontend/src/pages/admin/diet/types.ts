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
  created_at: string
}

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
  status: 'PENDING' | 'PREPARED' | 'SERVED' | 'HELD'
  prepared_at?: string
  prepared_by_name?: string
  served_at?: string
  served_by_name?: string
  remarks?: string
  diet_type: string
  pathya?: string
  apathya?: string
  special_instructions?: string
}

export const MEAL_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:  { label: 'Pending',  bg: 'bg-slate-100',  text: 'text-slate-700',   dot: 'bg-slate-400' },
  PREPARED: { label: 'Prepared', bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  SERVED:   { label: 'Served',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  HELD:     { label: 'Held',     bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
}

export const MEAL_TYPE_CONFIG: Record<string, { label: string; time: string; color: string }> = {
  BREAKFAST: { label: 'Breakfast', time: '07:30 AM', color: 'text-amber-600' },
  LUNCH:     { label: 'Lunch',     time: '12:30 PM', color: 'text-blue-600' },
  DINNER:    { label: 'Dinner',    time: '07:30 PM', color: 'text-indigo-600' },
  SNACKS:    { label: 'Snacks',    time: '04:30 PM', color: 'text-orange-600' },
}
