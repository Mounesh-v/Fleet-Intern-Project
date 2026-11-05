import jwt from 'jsonwebtoken';
import env from './env.js';

/**
 * TokenService — issues and verifies JWTs.
 *
 * OOP concepts:
 * - Encapsulation: signing/verifying logic is hidden behind one class.
 * - Single Responsibility: only handles tokens, nothing else.
 *
 * Each token embeds `tokenVersion`. Bumping the user's stored version
 * invalidates every outstanding token for that user (logout, deactivate,
 * password reset) without needing a server-side token blacklist.
 */
export default class TokenService {
  /**
   * Sign a JWT for the given user document.
   * @param {{ _id: unknown, role: string, tokenVersion?: number }} user
   * @returns {string} signed JWT
   */
  static sign(user) {
    const payload = {
      sub: String(user._id),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };
    return jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
  }

  /**
   * Verify a JWT and return its decoded payload.
   * Throws TokenExpiredError / JsonWebTokenError on failure.
   * @param {string} token
   * @returns {object} decoded payload
   */
  static verify(token) {
    return jwt.verify(token, env.jwtSecret);
  }
}
