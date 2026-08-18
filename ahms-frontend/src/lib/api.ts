import axios from 'axios'

export const TOKEN_KEY = 'ahms_token'
export const USER_KEY = 'ahms_user'
export const REFRESH_TOKEN_KEY = 'ahms_refresh_token'

export const PORTAL_TOKEN_KEY = 'ahms_portal_token'
export const PORTAL_USER_KEY = 'ahms_portal_user'
export const PORTAL_REFRESH_TOKEN_KEY = 'ahms_portal_refresh_token'

export interface ApiUser {
  id: string
  full_name: string
  email: string
  mobile: string
  role_name: string
  permissions: string[]
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in_seconds: number
  user: ApiUser
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  error?: string
  data: T
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getPortalToken(): string | null {
  return localStorage.getItem(PORTAL_TOKEN_KEY)
}

export function getPortalRefreshToken(): string | null {
  return localStorage.getItem(PORTAL_REFRESH_TOKEN_KEY)
}

export function saveAuth(data: LoginResponse, portal = false) {
  const tk = portal ? PORTAL_TOKEN_KEY : TOKEN_KEY
  const uk = portal ? PORTAL_USER_KEY : USER_KEY
  const rk = portal ? PORTAL_REFRESH_TOKEN_KEY : REFRESH_TOKEN_KEY
  localStorage.setItem(tk, data.access_token)
  localStorage.setItem(uk, JSON.stringify(data.user))
  localStorage.setItem(rk, data.refresh_token)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function clearPortalAuth() {
  localStorage.removeItem(PORTAL_TOKEN_KEY)
  localStorage.removeItem(PORTAL_USER_KEY)
  localStorage.removeItem(PORTAL_REFRESH_TOKEN_KEY)
}

export function getPortalUser(): ApiUser | null {
  const raw = localStorage.getItem(PORTAL_USER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ApiUser>
    return { permissions: [], ...parsed } as ApiUser
  } catch {
    return null
  }
}

export const api = axios.create({
  baseURL: '/api/v1',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const portalApi = axios.create({
  baseURL: '/api/v1',
})

portalApi.interceptors.request.use((config) => {
  const token = getPortalToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Refresh-token logic: prevent concurrent refresh attempts with a shared
// promise so multiple simultaneous 401s only trigger one refresh call.
// ---------------------------------------------------------------------------
let adminRefreshPromise: Promise<string> | null = null
let portalRefreshPromise: Promise<string> | null = null

function doRefresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  return axios
    .post<{ data: { access_token: string; refresh_token: string } }>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    })
    .then((res) => res.data.data)
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      const rt = getRefreshToken()
      if (!rt) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      originalRequest._retry = true

      if (!adminRefreshPromise) {
        adminRefreshPromise = doRefresh(rt)
          .then((tokens) => {
            localStorage.setItem(TOKEN_KEY, tokens.access_token)
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
            return tokens.access_token
          })
          .catch((err) => {
            clearAuth()
            window.location.href = '/login'
            return Promise.reject(err)
          })
          .finally(() => {
            adminRefreshPromise = null
          })
      }

      return adminRefreshPromise.then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      })
    }
    return Promise.reject(error)
  },
)

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      const rt = getPortalRefreshToken()
      if (!rt) {
        clearPortalAuth()
        window.location.href = '/portal/login'
        return Promise.reject(error)
      }
      originalRequest._retry = true

      if (!portalRefreshPromise) {
        portalRefreshPromise = doRefresh(rt)
          .then((tokens) => {
            localStorage.setItem(PORTAL_TOKEN_KEY, tokens.access_token)
            localStorage.setItem(PORTAL_REFRESH_TOKEN_KEY, tokens.refresh_token)
            return tokens.access_token
          })
          .catch((err) => {
            clearPortalAuth()
            window.location.href = '/portal/login'
            return Promise.reject(err)
          })
          .finally(() => {
            portalRefreshPromise = null
          })
      }

      return portalRefreshPromise.then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return portalApi(originalRequest)
      })
    }
    return Promise.reject(error)
  },
)

export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse<unknown> | undefined
    if (data?.error) return data.error
    if (data?.message) return data.message
  }
  return fallback
}

// openPrescriptionPrint fetches the backend-rendered HTML slip (auth header
// included via the axios instance) and opens it in a print-ready new tab.
export async function openPrescriptionPrint(id: string): Promise<void> {
  const res = await api.get<string>(`/prescriptions/${id}/print`, { responseType: 'text' })
  const win = window.open('', '_blank')
  if (!win) throw new Error('Popup blocked')
  win.document.open()
  win.document.write(res.data)
  win.document.close()
  win.focus()
}

// ---------------------------------------------------------------------------
// Reports API
// ---------------------------------------------------------------------------
export interface ReportFilters {
  from?: string
  to?: string
  department_id?: string
  doctor_id?: string
  group_by?: string
  expiry_days?: number
}

export const reportsApi = {
  getSummary: (f: ReportFilters) => api.get('/reports/summary', { params: f }).then((r) => r.data),
  getDepartmentDistribution: (f: ReportFilters) =>
    api.get('/reports/department-distribution', { params: f }).then((r) => r.data),
  getRevenue: (f: ReportFilters) => api.get('/reports/revenue', { params: f }).then((r) => r.data),
  getPharmacyDispensing: (f: ReportFilters) =>
    api.get('/reports/pharmacy-dispensing', { params: f }).then((r) => r.data),
  getPharmacyStock: (f: ReportFilters) =>
    api.get('/reports/pharmacy-stock', { params: f }).then((r) => r.data),
  getDoctors: (f: ReportFilters) => api.get('/reports/doctors', { params: f }).then((r) => r.data),
  getPatients: (f: ReportFilters) => api.get('/reports/patients', { params: f }).then((r) => r.data),
  getPanchakarma: (f: ReportFilters) =>
    api.get('/reports/panchakarma', { params: f }).then((r) => r.data),
  getReferrals: (f: ReportFilters) => api.get('/reports/referrals', { params: f }).then((r) => r.data),

  exportReport: async (report: string, format: string, filters: ReportFilters) => {
    if (format === 'print') {
      const res = await api.get('/reports/export', {
        params: { report, format, ...filters },
        responseType: 'text',
      })
      const win = window.open('', '_blank')
      if (!win) throw new Error('Popup blocked')
      win.document.open()
      win.document.write(res.data)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 300)
      return
    }

    const res = await api.get('/reports/export', {
      params: { report, format, ...filters },
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Extract filename from Content-Disposition header if possible
    let filename = `${report}-${format}-export`
    const disposition = res.headers['content-disposition']
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const matches = /filename="?([^"]+)"?/.exec(disposition)
      if (matches != null && matches[1]) {
        filename = matches[1]
      }
    } else {
      filename = `${report}.${format === 'excel' ? 'xls' : format}`
    }

    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}

// ─── Lab API ──────────────────────────────────────────────────────────────────

export interface LabCategory {
  id: string
  name: string
  code: string
  description: string
  is_active: boolean
}

export interface LabTest {
  id: string
  category_id: string
  category_name?: string
  name: string
  code: string
  sample_type: string
  method: string
  unit: string
  reference_range_male: string
  reference_range_female: string
  reference_range_child: string
  turnaround_hours: number
  cost: number
  is_active: boolean
}

export interface LabOrderItem {
  id: string
  test_id: string
  test_name: string
  test_code: string
  test_unit: string
  sample_type: string
  status: string
  result_value?: string
  result_unit?: string
  result_text?: string
  result_flag?: string
  reference_range_snapshot?: string
  remarks?: string
  resulted_by_name?: string
  resulted_at?: string
  verified_by_name?: string
  verified_at?: string
}

export interface LabSample {
  id: string
  order_id: string
  sample_type: string
  collection_method: string
  barcode?: string
  volume_ml?: number
  is_adequate: boolean
  notes?: string
  collected_by_name: string
  collected_at: string
}

export interface LabOrder {
  id: string
  order_no: string
  patient_id: string
  patient_name: string
  patient_uhid: string
  encounter_id?: string
  admission_id?: string
  department_id?: string
  ordered_by: string
  status: string
  priority: string
  clinical_notes: string
  cancel_reason?: string
  doctor_remarks?: string
  reviewed_by?: string
  reviewed_at?: string
  items: LabOrderItem[]
  sample?: LabSample
  created_at: string
}

export interface LabOrderListItem {
  id: string
  order_no: string
  patient_name: string
  patient_uhid: string
  status: string
  priority: string
  test_count: number
  pending_count: number
  ordered_by: string
  created_at: string
}

export const labApi = {
  // Categories
  listCategories: (activeOnly = true) =>
    api.get<ApiResponse<LabCategory[]>>('/lab/categories', { params: { active_only: activeOnly } }),
  createCategory: (data: Partial<LabCategory>) =>
    api.post<ApiResponse<LabCategory>>('/lab/categories', data),
  updateCategory: (id: string, data: Partial<LabCategory>) =>
    api.put<ApiResponse<LabCategory>>(`/lab/categories/${id}`, data),

  // Tests
  listTests: (categoryId?: string, activeOnly = true) =>
    api.get<ApiResponse<LabTest[]>>('/lab/tests', { params: { category_id: categoryId, active_only: activeOnly } }),
  createTest: (data: Partial<LabTest>) =>
    api.post<ApiResponse<LabTest>>('/lab/tests', data),
  updateTest: (id: string, data: Partial<LabTest>) =>
    api.put<ApiResponse<LabTest>>(`/lab/tests/${id}`, data),

  // Orders
  listOrders: (params?: Record<string, string | number>) =>
    api.get<ApiResponse<{ data: LabOrderListItem[]; total: number; page: number }>>('/lab/orders', { params }),
  getOrder: (id: string) =>
    api.get<ApiResponse<LabOrder>>(`/lab/orders/${id}`),
  createOrder: (data: object) =>
    api.post<ApiResponse<LabOrder>>('/lab/orders', data),
  cancelOrder: (id: string, reason: string) =>
    api.put<ApiResponse<null>>(`/lab/orders/${id}/cancel`, { reason }),

  // Workflow
  collectSample: (id: string, data: object) =>
    api.put<ApiResponse<null>>(`/lab/orders/${id}/collect`, data),
  markProcessing: (id: string) =>
    api.put<ApiResponse<null>>(`/lab/orders/${id}/process`, {}),
  enterResults: (id: string, results: object[]) =>
    api.put<ApiResponse<null>>(`/lab/orders/${id}/result`, { results }),
  verifyResults: (id: string) =>
    api.put<ApiResponse<null>>(`/lab/orders/${id}/verify`, {}),
  doctorReview: (id: string, doctor_remarks: string) =>
    api.put<ApiResponse<null>>(`/lab/orders/${id}/review`, { doctor_remarks }),

  // Print report
  printReport: (id: string) =>
    api.get<string>(`/lab/orders/${id}/report`).then(r => {
      const win = window.open('', '_blank')
      if (win) { win.document.write(r.data); win.document.close(); win.print() }
    }),

  // Patient timeline
  patientOrders: (patientId: string) =>
    api.get<ApiResponse<LabOrderListItem[]>>(`/patients/${patientId}/lab-orders`),
}

// ─── Diet API ──────────────────────────────────────────────────────────────────

export interface CreateDietPlanReq {
  admission_id: string
  patient_id: string
  diet_type: string
  pathya?: string
  apathya?: string
  special_instructions?: string
  start_date: string
  end_date: string
}

export const dietApi = {
  createDietPlan: (data: CreateDietPlanReq) =>
    api.post<ApiResponse<any>>('/diet/plans', data),
  getActiveDietPlan: (admissionId: string) =>
    api.get<ApiResponse<any>>(`/diet/plans/active?admission_id=${admissionId}`),
  listDietPlans: (admissionId: string) =>
    api.get<ApiResponse<any[]>>(`/diet/plans?admission_id=${admissionId}`),
  updateDietPlan: (id: string, data: CreateDietPlanReq) =>
    api.put<ApiResponse<any>>(`/diet/plans/${id}`, data),
  renewDietPlan: (id: string, endDate: string) =>
    api.post<ApiResponse<any>>(`/diet/plans/${id}/renew`, { end_date: endDate }),
  cancelDietPlan: (id: string, reason?: string) =>
    api.put<ApiResponse<null>>(`/diet/plans/${id}/cancel`, { reason }),
  generateDailyMeals: (date?: string) =>
    api.post<ApiResponse<{ count: number }>>('/diet/generate-meals', { date }),
  getKitchenSheet: (params?: Record<string, string | number>) =>
    api.get<ApiResponse<any[]>>('/diet/kitchen-sheet', { params }),
  updateMealStatus: (id: string, status: string, remarks?: string) =>
    api.put<ApiResponse<null>>(`/diet/meals/${id}/status`, { status, remarks }),
  createManualMeal: (data: { admission_id: string; meal_type: string; scheduled_date?: string; special_instructions?: string }) =>
    api.post<ApiResponse<any>>('/diet/meals', data),
  cancelMeal: (id: string, reason: string) =>
    api.put<ApiResponse<null>>(`/diet/meals/${id}/cancel`, { reason }),
  getWardList: () =>
    api.get<ApiResponse<any[]>>('/diet/ward-list'),
  getKitchenAdmissions: () =>
    api.get<ApiResponse<any[]>>('/diet/admissions'),
  listDietTemplates: (activeOnly?: boolean) =>
    api.get<ApiResponse<any[]>>('/diet/templates', { params: { active: activeOnly } }),
  createDietTemplate: (data: { name: string; pathya?: string; apathya?: string; special_instructions?: string }) =>
    api.post<ApiResponse<any>>('/diet/templates', data),
  updateDietTemplate: (id: string, data: { name: string; pathya?: string; apathya?: string; special_instructions?: string; is_active?: boolean }) =>
    api.put<ApiResponse<any>>(`/diet/templates/${id}`, data),
}


