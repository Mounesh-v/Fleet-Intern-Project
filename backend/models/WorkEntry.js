import mongoose from 'mongoose';

/**
 * WorkEntry — one day's work by a driver on a vehicle for a customer.
 *
 * Billing: billedAmount is snapshotted at creation from the RateCard
 * (JCB×hours, Tipper×loads (material rate), Ace×trips).
 *
 * Lifecycle: SUBMITTED → VERIFIED → LOCKED (reopen allowed by admin).
 *
 * OOP concepts:
 * - Class constants: STATUSES / TYPES are fixed vocabularies.
 * - Lazy singleton model via getModel(), mirroring User.
 */
class WorkEntry {
  static STATUSES = Object.freeze(['SUBMITTED', 'VERIFIED', 'LOCKED']);
  static TYPES = Object.freeze(['JCB', 'TIPPER', 'TATA_ACE']);

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (WorkEntry.#model) {
      return WorkEntry.#model;
    }

    const schema = new mongoose.Schema(
      {
        date: {
          type: Date,
          required: [true, 'Entry date is required'],
        },
        type: {
          type: String,
          enum: WorkEntry.TYPES,
          required: [true, 'Work type is required'],
        },
        vehicle: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vehicle',
          required: [true, 'Vehicle is required'],
        },
        driver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Driver',
          required: [true, 'Driver is required'],
        },
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
          default: null,
        },
        quarry: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Quarry',
          default: null,
        },
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Material',
          default: null,
        },
        jcbHours: {
          type: Number,
          min: [0, 'JCB hours must be zero or more'],
          default: 0,
        },
        tipperLoads: {
          type: Number,
          min: [0, 'Tipper loads must be zero or more'],
          default: 0,
        },
        aceTrips: {
          type: Number,
          min: [0, 'Ace trips must be zero or more'],
          default: 0,
        },
        dieselAmount: {
          type: Number,
          min: [0, 'Diesel amount must be zero or more'],
          default: 0,
        },
        dieselLitres: {
          type: Number,
          min: [0, 'Diesel litres must be zero or more'],
          default: 0,
        },
        otherExpense: {
          type: Number,
          min: [0, 'Other expense must be zero or more'],
          default: 0,
        },
        mobile: {
          type: String,
          trim: true,
          default: '',
          maxlength: [15, 'Mobile must be at most 15 characters'],
        },
        expenseCategory: {
          type: String,
          trim: true,
          default: '',
          maxlength: [40, 'Expense category must be at most 40 characters'],
        },
        expenseDescription: {
          type: String,
          trim: true,
          default: '',
          maxlength: [200, 'Expense description must be at most 200 characters'],
        },
        billedAmount: {
          type: Number,
          default: 0,
        },
        billNumber: {
          type: String,
          trim: true,
          default: '',
          maxlength: [30, 'Bill number must be at most 30 characters'],
        },
        rateSnapshot: {
          type: Number,
          default: 0,
        },
        location: {
          type: String,
          trim: true,
          default: '',
          maxlength: [120, 'Location must be at most 120 characters'],
        },
        notes: {
          type: String,
          trim: true,
          default: '',
          maxlength: [500, 'Notes must be at most 500 characters'],
        },
        status: {
          type: String,
          enum: WorkEntry.STATUSES,
          default: 'SUBMITTED',
        },
        verifiedAt: {
          type: Date,
          default: null,
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
      {
        timestamps: true,
        toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
        toObject: { transform(_doc, ret) { delete ret.__v; return ret; } },
      },
    );

    schema.index({ date: -1 });
    schema.index({ driver: 1, date: -1 });
    schema.index({ vehicle: 1, date: -1 });

    WorkEntry.#model = mongoose.model('WorkEntry', schema);
    return WorkEntry.#model;
  }
}

export default WorkEntry;
