import mongoose from 'mongoose';

/**
 * RateCard — billing rate per vehicle type, optionally scoped to a
 * material or customer, effective from a date.
 *
 * Resolution priority (see RateService.resolve):
 *   customer + material → customer → material → default (no scope).
 *
 * OOP concepts:
 * - Class constants: VEHICLE_TYPES / RATE_TYPES are paired vocabularies
 *   (JCB→HOUR, TIPPER→LOAD, TATA_ACE→TRIP) enforced by validation.
 * - Lazy singleton model via getModel(), mirroring User.
 */
class RateCard {
  static VEHICLE_TYPES = Object.freeze(['JCB', 'TIPPER', 'TATA_ACE']);
  static RATE_TYPES = Object.freeze(['HOUR', 'LOAD', 'TRIP']);
  static PAIRS = Object.freeze({
    JCB: 'HOUR',
    TIPPER: 'LOAD',
    TATA_ACE: 'TRIP',
  });

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (RateCard.#model) {
      return RateCard.#model;
    }

    const schema = new mongoose.Schema(
      {
        vehicleType: {
          type: String,
          enum: RateCard.VEHICLE_TYPES,
          required: [true, 'Vehicle type is required'],
        },
        rateType: {
          type: String,
          enum: RateCard.RATE_TYPES,
          required: [true, 'Rate type is required'],
        },
        amount: {
          type: Number,
          required: [true, 'Amount is required'],
          min: [0, 'Amount must be zero or more'],
        },
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Material',
          default: null,
        },
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
          default: null,
        },
        effectiveFrom: {
          type: Date,
          required: [true, 'Effective from date is required'],
        },
        active: {
          type: Boolean,
          default: true,
        },
      },
      {
        timestamps: true,
        toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
        toObject: { transform(_doc, ret) { delete ret.__v; return ret; } },
      },
    );

    RateCard.#model = mongoose.model('RateCard', schema);
    return RateCard.#model;
  }
}

export default RateCard;
