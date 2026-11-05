import api, { getApiErrorMessage } from '../../../services/api';

/**
 * Logs in and returns { token, user }.
 * Throws an Error with a user-facing message on failure.
 */
export async function login(username, password) {
  try {
    const response = await api.post('/auth/login', { username, password });
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Login failed. Please try again.'));
  }
}

export async function fetchCurrentUser() {
  try {
    const response = await api.get('/auth/me');
    return response.data.data.user;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Session is no longer valid.'));
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Server-side invalidation may already have happened;
    // the local session is cleared regardless.
  }
}
