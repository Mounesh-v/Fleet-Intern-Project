import AppError from '../utility/AppError.js';

/**
 * AuthValidator — API request validation for auth endpoints.
 *
 * Layer position: api/ validates the HTTP contract before the
 * service layer runs business rules.
 *
 * OOP concepts:
 * - Static utility class: stateless helpers grouped by domain.
 * - Encapsulation: validation rules live next to the auth API only.
 */
export default class AuthValidator {
  static #isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /** @returns {string[]} list of error messages (empty when valid) */
  static validateLogin(body) {
    const errors = [];
    if (!AuthValidator.#isNonEmptyString(body?.username)) {
      errors.push('username is required');
    }
    if (!AuthValidator.#isNonEmptyString(body?.password)) {
      errors.push('password is required');
    }
    return errors;
  }

  static validateCreateDriver(body) {
    const errors = [];
    if (!AuthValidator.#isNonEmptyString(body?.username)) {
      errors.push('username is required');
    } else if (body.username.trim().length < 3) {
      errors.push('username must be at least 3 characters');
    }
    if (!AuthValidator.#isNonEmptyString(body?.password)) {
      errors.push('password is required');
    } else if (body.password.length < 6) {
      errors.push('password must be at least 6 characters');
    }
    if (!AuthValidator.#isNonEmptyString(body?.driverId)) {
      errors.push('driverId is required and must reference a driver record');
    } else if (!/^[0-9a-fA-F]{24}$/.test(body.driverId.trim())) {
      errors.push('driverId must be a valid driver record identifier');
    }
    return errors;
  }

  static validateResetPassword(body) {
    const errors = [];
    if (!AuthValidator.#isNonEmptyString(body?.password)) {
      errors.push('password is required');
    } else if (body.password.length < 6) {
      errors.push('password must be at least 6 characters');
    } else if (!AuthValidator.isPasswordStrong(body.password)) {
      errors.push(
        'password must include at least one uppercase letter, one lowercase letter, and one number',
      );
    }
    return errors;
  }

  static validateStatus(body) {
    const errors = [];
    if (!AuthValidator.#isNonEmptyString(body?.status)) {
      errors.push('status is required');
    } else if (!['ACTIVE', 'INACTIVE'].includes(body.status)) {
      errors.push('status must be ACTIVE or INACTIVE');
    }
    return errors;
  }

  static isPasswordStrong(password) {
    return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
  }

  /**
   * Throw AppError when any validator returns messages.
   * @param {string[]} errors
   */
  static assert(errors) {
    if (errors.length > 0) {
      throw new AppError('Validation failed', 400, errors);
    }
  }
}
