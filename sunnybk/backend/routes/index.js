const express = require('express');
const router = express.Router();

const { authenticate, requireAdmin } = require('../middleware/auth');
const { login, me } = require('../controllers/authController');
const { getCustomers, getCustomerById, createCustomer, updateCustomer } = require('../controllers/customerController');
const { getEnquiries, getEnquiryById, createEnquiry, updateEnquiry, addEnquiryLog, getEnquiryStats } = require('../controllers/enquiryController');
const { getEmployees, getDepartments, createEmployee, updateEmployee, createDepartment, updateDepartment } = require('../controllers/employeeController');
const { getVisits, getVisitById, createVisit, updateVisit, rescheduleVisit, completeVisit, cancelVisit } = require('../controllers/visitController');
const { getOrders, getOrderById, createOrder, updateOrder, addOrderLog, getOrderStats, getPendingPayments, getOrderPayments, recordPayment } = require('../controllers/orderController');
const { getOverview, getEnquiriesOverTime, getEnquiriesBySource, getRevenue, getEmployeePerformance } = require('../controllers/reportsController');
const { getCalendarData } = require('../controllers/calendarController');
const { getSettings, updateSettings } = require('../controllers/settingsController');

// ── Public ──
router.post('/auth/login', login);

// ── All authenticated users ──
router.get('/auth/me', authenticate, me);

// Customers (read = all auth, write = admin only)
router.get('/customers', authenticate, getCustomers);
router.get('/customers/:id', authenticate, getCustomerById);
router.post('/customers', authenticate, requireAdmin, createCustomer);
router.put('/customers/:id', authenticate, requireAdmin, updateCustomer);

// Enquiries (all authenticated)
router.get('/enquiries/stats', authenticate, getEnquiryStats);
router.get('/enquiries', authenticate, getEnquiries);
router.get('/enquiries/:id', authenticate, getEnquiryById);
router.post('/enquiries', authenticate, createEnquiry);
router.put('/enquiries/:id', authenticate, updateEnquiry);
router.post('/enquiries/:id/logs', authenticate, addEnquiryLog);

// Employees & departments (read = all auth, write = admin only)
router.get('/employees', authenticate, getEmployees);
router.post('/employees', authenticate, requireAdmin, createEmployee);
router.put('/employees/:id', authenticate, requireAdmin, updateEmployee);
router.get('/departments', authenticate, getDepartments);
router.post('/departments', authenticate, requireAdmin, createDepartment);
router.put('/departments/:id', authenticate, requireAdmin, updateDepartment);

// Visits (admin only)
router.get('/visits', authenticate, requireAdmin, getVisits);
router.get('/visits/:id', authenticate, requireAdmin, getVisitById);
router.post('/visits', authenticate, requireAdmin, createVisit);
router.put('/visits/:id', authenticate, requireAdmin, updateVisit);
router.post('/visits/:id/reschedule', authenticate, requireAdmin, rescheduleVisit);
router.post('/visits/:id/complete', authenticate, requireAdmin, completeVisit);
router.post('/visits/:id/cancel', authenticate, requireAdmin, cancelVisit);

// Orders (admin only) — static routes MUST come before /:id
router.get('/orders/stats',            authenticate, requireAdmin, getOrderStats);
router.get('/orders/pending-payments', authenticate, requireAdmin, getPendingPayments);
router.get('/orders',                  authenticate, requireAdmin, getOrders);
router.get('/orders/:id',              authenticate, requireAdmin, getOrderById);
router.post('/orders',                 authenticate, requireAdmin, createOrder);
router.put('/orders/:id',              authenticate, requireAdmin, updateOrder);
router.post('/orders/:id/logs',        authenticate, requireAdmin, addOrderLog);
router.get('/orders/:id/payments',       authenticate, requireAdmin, getOrderPayments);
router.post('/orders/:id/record-payment', authenticate, requireAdmin, recordPayment);

// Organisation settings
router.get('/settings',  authenticate, getSettings);
router.put('/settings',  authenticate, requireAdmin, updateSettings);

// Calendar (admin only)
router.get('/calendar', authenticate, requireAdmin, getCalendarData);

// Reports (admin only)
router.get('/reports/overview',             authenticate, requireAdmin, getOverview);
router.get('/reports/enquiries-over-time',  authenticate, requireAdmin, getEnquiriesOverTime);
router.get('/reports/enquiries-by-source',  authenticate, requireAdmin, getEnquiriesBySource);
router.get('/reports/revenue',              authenticate, requireAdmin, getRevenue);
router.get('/reports/employee-performance', authenticate, requireAdmin, getEmployeePerformance);

module.exports = router;
