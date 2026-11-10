// @ts-nocheck
import api, { getApiErrorMessage } from './api';

/**
 * Admin API service — every admin backend call for the dashboard.
 * Mirrors authService: envelope is { success, message, data }.
 */

async function get(path, fallback) {
  try {
    const response = await api.get(path);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function post(path, body, fallback) {
  try {
    const response = await api.post(path, body);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function patch(path, body, fallback) {
  try {
    const response = await api.patch(path, body);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function del(path, fallback) {
  try {
    const response = await api.delete(path);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function put(path, body, fallback) {
  try {
    const response = await api.put(path, body);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

// --- Driver login accounts (admin-created credentials only) -------------

export function fetchDriverAccounts() {
  return get('/auth/driver-accounts', 'Could not load login accounts.');
}

export function createDriverAccount(body) {
  return post('/auth/create-driver', body, 'Could not create login account.');
}

export function resetDriverPassword(userId, password) {
  return put(
    `/auth/reset-password/${userId}`,
    { password },
    'Could not reset password.',
  );
}

// --- Dashboard ----------------------------------------------------------

export function fetchDashboard(query = '') {
  return get(`/admin/dashboard${query}`, 'Could not load dashboard stats.');
}

// --- Vehicles -----------------------------------------------------------

export function fetchVehicles(query = '') {
  return get(`/admin/vehicles${query}`, 'Could not load vehicles.');
}

export function createVehicle(body) {
  return post('/admin/vehicles', body, 'Could not create vehicle.');
}

export function removeVehicle(id) {
  return del(`/admin/vehicles/${id}`, 'Could not delete vehicle.');
}

// --- Drivers ------------------------------------------------------------

export function fetchDrivers(query = '') {
  return get(`/admin/drivers${query}`, 'Could not load drivers.');
}

export function createDriver(body) {
  return post('/admin/drivers', body, 'Could not create driver.');
}

export function removeDriver(id) {
  return del(`/admin/drivers/${id}`, 'Could not delete driver.');
}

/** Admin: assign a vehicle to a driver (vehicleId null = unassign). */
export function assignDriverVehicle(id, vehicleId) {
  return patch(
    `/admin/drivers/${id}/vehicle`,
    { vehicle: vehicleId },
    'Could not update vehicle assignment.',
  );
}

// --- Work entries -------------------------------------------------------

export function fetchWorkEntries(query = '') {
  return get(`/admin/work-entries${query}`, 'Could not load work entries.');
}

export function removeWorkEntry(id) {
  return del(`/admin/work-entries/${id}`, 'Could not delete work entry.');
}

export function removeWorkEntries(ids) {
  return post(
    '/admin/work-entries/bulk-delete',
    { ids },
    'Could not delete selected entries.',
  );
}

export function setWorkEntryStatus(id, status) {
  return patch(
    `/admin/work-entries/${id}/status`,
    { status },
    'Could not update entry status.',
  );
}

// --- Master data (reference lists for forms) -----------------------------

export function fetchCustomers() {
  return get('/admin/customers', 'Could not load customers.');
}

export function createCustomer(body) {
  return post('/admin/customers', body, 'Could not create the customer.');
}

export function updateCustomer(id, body) {
  return put(`/admin/customers/${id}`, body, 'Could not update the customer.');
}

export function removeCustomer(id) {
  return del(`/admin/customers/${id}`, 'Could not delete the customer.');
}

/** Customer account statement: opening balance, bills, payments, totals. */
export function fetchCustomerStatement(id) {
  return get(
    `/admin/customers/${id}/statement`,
    'Could not load the statement.',
  );
}

export function fetchQuarries() {
  return get('/admin/quarries', 'Could not load quarries.');
}

export function createQuarry(body) {
  return post('/admin/quarries', body, 'Could not create the quarry.');
}

export function removeQuarry(id) {
  return del(`/admin/quarries/${id}`, 'Could not delete the quarry.');
}

export function fetchMaterials() {
  return get('/admin/materials', 'Could not load materials.');
}

export function createMaterial(body) {
  return post('/admin/materials', body, 'Could not create the material.');
}

export function removeMaterial(id) {
  return del(`/admin/materials/${id}`, 'Could not delete the material.');
}

export function fetchRates() {
  return get('/admin/rates', 'Could not load rates.');
}

export function createRate(body) {
  return post('/admin/rates', body, 'Could not create the rate.');
}

export function removeRate(id) {
  return del(`/admin/rates/${id}`, 'Could not delete the rate.');
}

// --- Payments & expenses -------------------------------------------------

export function fetchPayments(query = '') {
  return get(`/admin/payments${query}`, 'Could not load payments.');
}

export function fetchExpenses(query = '') {
  return get(`/admin/expenses${query}`, 'Could not load expenses.');
}

export function createWorkEntry(body) {
  return post('/admin/work-entries', body, 'Could not save the work entry.');
}

export function createExpense(body) {
  return post('/admin/expenses', body, 'Could not record the expense.');
}

export function createPayment(body) {
  return post('/admin/payments', body, 'Could not record the payment.');
}

export function removePayment(id) {
  return del(`/admin/payments/${id}`, 'Could not delete the payment.');
}

export function removePayments(ids) {
  return post(
    '/admin/payments/bulk-delete',
    { ids },
    'Could not delete selected payments.',
  );
}

export function removeExpense(id) {
  return del(`/admin/expenses/${id}`, 'Could not delete the expense.');
}

export function removeExpenses(ids) {
  return post(
    '/admin/expenses/bulk-delete',
    { ids },
    'Could not delete selected expenses.',
  );
}

// --- Formatting helpers --------------------------------------------------

/** ₹ formatting with Indian digit grouping. */
export function formatMoney(value) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** ISO date → DD/MM/YYYY (accepts Date or string). */
export function formatDay(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/** Short label for a work type. */
export function typeLabel(type) {
  if (type === 'TATA_ACE') return 'Ace';
  if (type === 'TIPPER') return 'Tipper';
  return type || '—';
}

/** Quantity summary for a work entry row. */
export function entryQuantity(entry) {
  if (entry.type === 'JCB') return `${entry.jcbHours} hrs`;
  if (entry.type === 'TIPPER') return `${entry.tipperLoads} loads`;
  if (entry.type === 'TATA_ACE') return `${entry.aceTrips} trips`;
  return '—';
}
