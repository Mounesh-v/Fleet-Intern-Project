import mongoose from 'mongoose';

/**
 * Vehicle — fleet vehicle master record (JCB / Tipper / Tata Ace).
 *
 * OOP concepts:
 * - Class constants: TYPES / STATUSES are a fixed public vocabulary.
 * - Lazy singleton model via getModel(), mirroring User.
 */
class Vehicle {
  static TYPES = Object.freeze(['JCB', 'TIPPER', 'TATA_ACE']);
  static STATUSES = Object.freeze(['ACTIVE', 'MAINTENANCE', 'INACTIVE']);

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Vehicle.#model) {
      return Vehicle.#model;
    }

    const schema = new mongoose.Schema(
      {
        registrationNo: {
          type: String,
          required: [true, 'Registration number is required'],
          unique: true,
          trim: true,
          uppercase: true,
          maxlength: [20, 'Registration number must be at most 20 characters'],
        },
        type: {
          type: String,
          enum: Vehicle.TYPES,
          required: [true, 'Vehicle type is required'],
        },
        brand: {
          type: String,
          trim: true,
          default: '',
          maxlength: [40, 'Brand must be at most 40 characters'],
        },
        model: {
          type: String,
          trim: true,
          default: '',
          maxlength: [40, 'Model must be at most 40 characters'],
        },
        year: {
          type: Number,
          min: [1990, 'Year must be 1990 or later'],
          max: [2100, 'Year must be 2100 or earlier'],
          default: null,
        },
        fuelType: {
          type: String,
          enum: ['DIESEL', 'PETROL', 'ELECTRIC'],
          default: 'DIESEL',
        },
        status: {
          type: String,
          enum: Vehicle.STATUSES,
          default: 'ACTIVE',
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

    Vehicle.#model = mongoose.model('Vehicle', schema);
    return Vehicle.#model;
  }
}

export default Vehicle;
