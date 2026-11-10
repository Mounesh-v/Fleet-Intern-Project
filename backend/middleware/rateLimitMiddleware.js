import ApiResponse from '../utility/apiResponse.js';

/**
 * RateLimitMiddleware — brute-force protection for login attempts.
 *
 * OOP concepts:
 * - Encapsulation: the attempt store is private to the class.
 * - Factory: login() returns a configured middleware (closed-over policy).
 *
 * Policy: failed logins (HTTP 401) are counted per (IP + username)
 * and per IP. Reaching a limit locks that key for the window and
 * answers 429 with Retry-After; a successful login clears the
 * per-user key. The in-memory store is single-process — swap for a
 * shared store (e.g. Redis) if running multiple instances.
 */
export default class RateLimitMiddleware {
  static #store = new Map();

  /**
   * Login limiter: 5 failures / 15 min per IP+username, and
   * 20 failures / 15 min per IP (stops password spraying).
   * @param {{ windowMs?: number, maxPerKey?: number, maxPerIp?: number }} [options]
   * @returns {import('express').RequestHandler}
   */
  static login(options = {}) {
    const windowMs = options.windowMs ?? 15 * 60 * 1000;
    const maxPerKey = options.maxPerKey ?? 5;
    const maxPerIp = options.maxPerIp ?? 20;

    return function loginRateLimit(req, res, next) {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const username = String(req.body?.username || '').trim().toLowerCase();
      const userKey = `${ip}|${username}`;
      const now = Date.now();

      RateLimitMiddleware.#prune(now);

      const lockedFor = Math.max(
        RateLimitMiddleware.#lockedFor(userKey, now),
        RateLimitMiddleware.#lockedFor(`ip:${ip}`, now),
      );
      if (lockedFor > 0) {
        const seconds = Math.ceil(lockedFor / 1000);
        res.setHeader('Retry-After', String(seconds));
        return ApiResponse.failure(
          res,
          `Too many failed attempts. Try again in ${seconds} seconds.`,
          429,
        );
      }

      // Observe this attempt's outcome once the response finishes.
      res.on('finish', () => {
        const at = Date.now();
        if (res.statusCode === 401) {
          RateLimitMiddleware.#recordFailure(userKey, at, windowMs, maxPerKey);
          RateLimitMiddleware.#recordFailure(`ip:${ip}`, at, windowMs, maxPerIp);
        } else if (res.statusCode < 400) {
          RateLimitMiddleware.#store.delete(userKey);
        }
      });

      return next();
    };
  }

  /** Milliseconds remaining until the key unlocks (0 = not locked). */
  static #lockedFor(key, now) {
    const entry = RateLimitMiddleware.#store.get(key);
    if (!entry || !entry.lockedUntil) return 0;
    return entry.lockedUntil > now ? entry.lockedUntil - now : 0;
  }

  static #recordFailure(key, now, windowMs, max) {
    let entry = RateLimitMiddleware.#store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { failures: 0, resetAt: now + windowMs, lockedUntil: 0 };
    }
    entry.failures += 1;
    if (entry.failures >= max) {
      entry.lockedUntil = now + windowMs;
    }
    RateLimitMiddleware.#store.set(key, entry);
  }

  static #prune(now) {
    for (const [key, entry] of RateLimitMiddleware.#store) {
      if (
        entry.resetAt <= now &&
        (!entry.lockedUntil || entry.lockedUntil <= now)
      ) {
        RateLimitMiddleware.#store.delete(key);
      }
    }
  }
}
