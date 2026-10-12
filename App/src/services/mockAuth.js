import { drivers } from '../data/mockData';

/**
 * MOCK AUTHENTICATION — UI preview only.
 *
 * This module exists so the app can be demonstrated without a backend.
 * It must be replaced by real authentication before production:
 *   - the server verifies driver credentials and issues a session token,
 *   - the server authorizes every request against that driver's identity,
 *   - drivers can only read their own work records.
 * Hiding screens in the mobile app is NOT a security control.
 *
 * Returns a driver session object, or null when credentials are invalid.
 */
export function mockAuthenticate(username, password) {
  const key = String(username || '')
    .trim()
    .toLowerCase();

  const driver = drivers.find(
    d =>
      d.username.toLowerCase() === key &&
      d.password === String(password || '') &&
      d.status === 'Active',
  );

  if (!driver) {
    return null;
  }

  return {
    role: 'Driver',
    driverId: driver.id,
    username: driver.username,
    name: driver.name,
    employeeId: driver.employeeId,
    phone: driver.phone,
    vehicle: driver.vehicle,
    language: 'en',
  };
}
