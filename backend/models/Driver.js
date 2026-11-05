import mongoose from 'mongoose';

/**
 * Driver — driver master record. Linked to User.driverId for logins.
 *
 * OOP concepts:
 * - Class constants: STATUSES are a fixed public vocabulary.
 * - Lazy singleton model via getModel(), mirroring User.
 */
class Driver {
  static STATUSES = Object.freeze(['ACTIVE', 'INACTIVE']);

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Driver.#model) {
      return Driver.#model;
    }

    const schema = new mongoose.Schema(
      {
        name: {
          type: String,
          required: [true, 'Driver name is required'],
          trim: true,
          maxlength: [60, 'Name must be at most 60 characters'],
        },
        phone: {
          type: String,
          trim: true,
          default: '',
          maxlength: [15, 'Phone must be at most 15 characters'],
        },
        employeeId: {
          type: String,
          trim: true,
          uppercase: true,
          sparse: true,
          unique: true,
          default: null,
          maxlength: [20, 'Employee ID must be at most 20 characters'],
        },
        licenseNo: {
          type: String,
          trim: true,
          uppercase: true,
          default: '',
          maxlength: [30, 'License number must be at most 30 characters'],
        },
        /**
         * Vehicle currently assigned to this driver by the admin.
         * Convenience link only — work entries still carry their own
         * vehicle snapshot, so reassignment never rewrites history.
         */
        vehicle: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vehicle',
          default: null,
        },
        status: {
          type: String,
          enum: Driver.STATUSES,
          default: 'ACTIVE',
        },
        joinedAt: {
          type: Date,
          default: null,
        },
        notes: {
          type: String,
          trim: true,
          default: '',
          maxlength: [300, 'Notes must be at most 300 characters'],
        },
      },
      {
        timestamps: true,
        toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
        toObject: { transform(_doc, ret) { delete ret.__v; return ret; } },
      },
    );

    Driver.#model = mongoose.model('Driver', schema);
    return Driver.#model;
  }
}

export default Driver;
