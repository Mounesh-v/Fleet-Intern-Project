/**
 * ApiResponse — shapes every HTTP body into a consistent envelope.
 *
 * OOP concepts:
 * - Static methods (class-level API, no instance state needed).
 * - Encapsulation: success/failure formats live in one place only.
 */
export default class ApiResponse {
  /**
   * Send a success envelope: { success, message, data }.
   * @param {import('express').Response} res
   * @param {string} message
   * @param {object} [data]
   * @param {number} [statusCode]
   */
  static success(res, message, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a failure envelope: { success, message, errors? }.
   * @param {import('express').Response} res
   * @param {string} message
   * @param {number} [statusCode]
   * @param {string[]} [errors]
   */
  static failure(res, message, statusCode = 400, errors = undefined) {
    const body = { success: false, message };
    if (errors) {
      body.errors = errors;
    }
    return res.status(statusCode).json(body);
  }
}
