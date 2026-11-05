import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User — domain model for admin and driver login accounts.
 *
 * OOP concepts:
 * - Encapsulation: schema, hashing rules, and password comparison live
 *   inside this class; callers never touch bcrypt or the raw schema.
 * - Class constants: ROLES / STATUSES are a fixed public vocabulary.
 * - Instance methods (via schema.methods): comparePassword and
 *   isTokenVersionValid act like behavior on a single user document.
 * - Static members: getModel() is a lazy singleton factory.
 *
 * Security:
 * - password has select:false (not loaded unless explicitly requested)
 * - toJSON / toObject strip password and tokenVersion from API output
 */
class User {
  static ROLES = Object.freeze(['ADMIN', 'DRIVER']);
  static STATUSES = Object.freeze(['ACTIVE', 'INACTIVE']);

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (User.#model) {
      return User.#model;
    }

    const schema = new mongoose.Schema(
      {
        username: {
          type: String,
          required: [true, 'Username is required'],
          unique: true,
          trim: true,
          lowercase: true,
          minlength: [3, 'Username must be at least 3 characters'],
          maxlength: [40, 'Username must be at most 40 characters'],
        },
        password: {
          type: String,
          required: [true, 'Password is required'],
          minlength: [6, 'Password must be at least 6 characters'],
          select: false,
        },
        role: {
          type: String,
          enum: User.ROLES,
          required: true,
        },
        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Driver',
          default: null,
        },
        status: {
          type: String,
          enum: User.STATUSES,
          default: 'ACTIVE',
        },
        lastLogin: {
          type: Date,
          default: null,
        },
        /**
         * Incremented on logout, deactivation, and password reset.
         * JWTs carry the version they were issued under; a mismatch
         * invalidates the token server-side.
         */
        tokenVersion: {
          type: Number,
          default: 0,
          select: false,
        },
      },
      {
        timestamps: true,
        toJSON: {
          transform(_doc, ret) {
            delete ret.password;
            delete ret.tokenVersion;
            delete ret.__v;
            return ret;
          },
        },
        toObject: {
          transform(_doc, ret) {
            delete ret.password;
            delete ret.tokenVersion;
            delete ret.__v;
            return ret;
          },
        },
      },
    );

    // Instance hook: hash plaintext password whenever it changes.
    schema.pre('save', async function hashPasswordHook(next) {
      if (!this.isModified('password')) {
        return next();
      }
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      return next();
    });

    // Instance methods — object behavior on a user document.
    schema.methods.comparePassword = function comparePassword(candidate) {
      return bcrypt.compare(candidate, this.password);
    };

    schema.methods.isTokenVersionValid = function isTokenVersionValid(version) {
      return (this.tokenVersion || 0) === version;
    };

    User.#model = mongoose.model('User', schema);
    return User.#model;
  }

  /**
   * Return a safe copy for API responses (no password / tokenVersion).
   * @param {object} user - Mongoose document or plain object
   * @returns {object}
   */
  static toSafeUser(user) {
    const obj = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete obj.password;
    delete obj.tokenVersion;
    return obj;
  }
}

export default User;
