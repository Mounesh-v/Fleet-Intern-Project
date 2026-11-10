// @ts-nocheck
import api, { getApiErrorMessage } from './api';

/**
 * Driver API service — everything the driver portal calls.
 * Mirrors adminService: envelope is { success, message, data }.
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

/** Own profile: safe user + driver (with assigned vehicle). */
export function fetchDriverSession() {
  return get('/driver/me', 'Could not load your profile.');
}

/** Form reference data: active vehicles, materials, quarries. */
export function fetchDriverOptions() {
  return get('/driver/options', 'Could not load form options.');
}

/** Own work entries, newest first. */
export function fetchMyEntries(query = '') {
  return get(`/driver/entries${query}`, 'Could not load your entries.');
}

/** Submit a work entry (server derives type, billing, driver scope). */
export function createMyEntry(body) {
  return post('/driver/entries', body, 'Could not save the work entry.');
}
