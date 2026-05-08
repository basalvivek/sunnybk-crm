import axios from 'axios';
const api = axios.create({ baseURL: '/api' });

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sbk_token');
      localStorage.removeItem('sbk_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authLogin = (data) => api.post('/auth/login', data);
export const getCustomers = (search) => api.get('/customers', { params: { search } });
export const getCustomerById = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const getEnquiries = (params) => api.get('/enquiries', { params });
export const getEnquiryById = (id) => api.get(`/enquiries/${id}`);
export const createEnquiry = (data) => api.post('/enquiries', data);
export const updateEnquiry = (id, data) => api.put(`/enquiries/${id}`, data);
export const addEnquiryLog = (id, data) => api.post(`/enquiries/${id}/logs`, data);
export const getEnquiryStats = () => api.get('/enquiries/stats');
export const getEmployees = (params) => api.get('/employees', { params });
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const getDepartments = () => api.get('/departments');
export const createDepartment = (data) => api.post('/departments', data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const getVisits = (params) => api.get('/visits', { params });
export const getVisitById = (id) => api.get(`/visits/${id}`);
export const createVisit = (data) => api.post('/visits', data);
export const updateVisit = (id, data) => api.put(`/visits/${id}`, data);
export const rescheduleVisit = (id, data) => api.post(`/visits/${id}/reschedule`, data);
export const completeVisit = (id, data) => api.post(`/visits/${id}/complete`, data);
export const cancelVisit = (id, data) => api.post(`/visits/${id}/cancel`, data);
export const getOrders = (params) => api.get('/orders', { params });
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
export const addOrderLog = (id, data) => api.post(`/orders/${id}/logs`, data);
export const getOrderStats        = ()         => api.get('/orders/stats');
export const getPendingPayments   = ()         => api.get('/orders/pending-payments');
export const getOrderPayments     = (id)       => api.get(`/orders/${id}/payments`);
export const recordPayment        = (id, data) => api.post(`/orders/${id}/record-payment`, data);
export const getOrgSettings    = ()     => api.get('/settings');
export const updateOrgSettings = (data) => api.put('/settings', data);
export const getCalendarData   = (year, month) => api.get('/calendar', { params: { year, month } });
export const getReportOverview        = (p) => api.get('/reports/overview',             { params: p });
export const getReportEnquiriesTime   = (p) => api.get('/reports/enquiries-over-time',  { params: p });
export const getReportEnquiriesSource = (p) => api.get('/reports/enquiries-by-source',  { params: p });
export const getReportRevenue         = (p) => api.get('/reports/revenue',              { params: p });
export const getReportEmployees       = (p) => api.get('/reports/employee-performance', { params: p });
export default api;
