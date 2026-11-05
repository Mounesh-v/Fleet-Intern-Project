/**
 * BaseService — shared base class for all service-layer classes.
 *
 * OOP concepts:
 * - Inheritance: domain services extend this base and reuse helpers.
 * - Template placeholders: subclasses implement domain use-cases.
 * - Encapsulation: cross-cutting service concerns live here once.
 */
export default class BaseService {
  /**
   * Normalize a username for storage/lookup (trim + lowercase).
   * @param {string} username
   * @returns {string}
   */
  static normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  /**
   * Safely bump a numeric version field (tokenVersion pattern).
   * @param {number|undefined|null} current
   * @returns {number} next version
   */
  static nextTokenVersion(current) {
    return (current || 0) + 1;
  }

  /**
   * Strip internal fields before returning data to controllers.
   * Mirrors User.toSafeUser but works for any plain object.
   * @param {object} record
   * @param {...string} secretKeys
   * @returns {object} shallow copy without secrets
   */
  static sanitize(record, ...secretKeys) {
    const copy = { ...record };
    for (const key of secretKeys) {
      delete copy[key];
    }
    return copy;
  }
}
