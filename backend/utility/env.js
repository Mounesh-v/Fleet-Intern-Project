import 'dotenv/config';

/**
 * Env — typed access to environment variables.
 *
 * OOP concepts:
 * - Encapsulation: all env reads are centralized here.
 * - Static members: configuration is process-wide, not per-instance.
 */
class Env {
  constructor() {
    this.port = Number(process.env.PORT) || 5000;
    this.mongoUri = process.env.MONGODB_URI;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN;
    this.adminUsername = process.env.ADMIN_USERNAME || 'admin';
    this.adminPassword = process.env.ADMIN_PASSWORD;
  }

  /** Throws if any required variable is missing. */
  assertEnv() {
    const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }
  }
}

/** Singleton instance — one shared configuration for the process. */
const env = new Env();
export default env;
