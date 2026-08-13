export interface ReportTable {
  title: string
  columns: string[]
  rows: string[][]
}

export interface SummaryReport {
  from: string
  to: string
  opd_encounters: number
  completed_opd: number
  ipd_admissions: number
  current_ipd: number
  new_patients: number
  visiting_patients: number
  appointments: number
  referrals_created: number
  pending_referrals: number
  treatment_plans: number
  sessions_completed: number
  dispensed_prescriptions: number
  diet_orders: number
  bills: number
  total_amount: number
  discount: number
  net_amount: number
  paid_amount: number
  due_amount: number
  bed_total: number
  bed_occupied: number
  table: ReportTable
}

export interface DepartmentDistributionReport {
  from: string
  to: string
  rows: {
    department_id: string
    department_code: string
    department_name: string
    opd: number
    ipd: number
    procedures: number
    dispensing: number
    diet: number
  }[]
  totals: {
    opd: number
    ipd: number
    procedures: number
    dispensing: number
    diet: number
  }
  table: ReportTable
}

export interface RevenueRow {
  key: string
  bills: number
  total: number
  discount: number
  net: number
  paid: number
  due: number
}

export interface RevenueReport {
  from: string
  to: string
  group_by: string
  rows: RevenueRow[]
  totals: RevenueRow
  table: ReportTable
}
