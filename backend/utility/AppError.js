/**
 * AppError — custom operational error type.
 *
 * OOP concepts:
 * - Inheritance: extends the built-in Error class.
 * - Encapsulation: bundles message, HTTP status, and optional field errors
 *   into a single object so handlers never parse free-form errors.
 */
export default class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string[]} [errors] - Optional field-level validation details
   */
  constructor(message, statusCode = 400, errors = undefined) {
    super(message); // Call parent Error constructor
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Distinguishes expected errors from bugs
  }
}
