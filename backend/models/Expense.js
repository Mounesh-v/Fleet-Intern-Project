import mongoose from 'mongoose';

/**
 * Expense — money spent: operating costs (diesel, toll, food, ...)
 * or vehicle-specific costs (insurance, service, FC, EMI).
 *
 * OOP concepts:
 * - Class constants: KINDS / CATEGORIES are fixed vocabularies;
 *   CATEGORIES_BY_KIND pairs each category with its allowed kind.
 * - Lazy singleton model via getModel(), mirroring User.
 */
class Expense {
  static KINDS = Object.freeze(['OPERATING', 'VEHICLE']);
  static CATEGORIES = Object.freeze([
    'DIESEL',
    'TOLL',
    'FOOD',
    'REPAIR',
    'SPARE_PARTS',
    'DRIVER_BATA',
    'INSURANCE',
    'SERVICE',
    'FC',
    'EMI',
    'OTHER',
  ]);
  static CATEGORIES_BY_KIND = Object.freeze({
    OPERATING: Object.freeze([
      'DIESEL',
      'TOLL',
      'FOOD',
      'REPAIR',
      'SPARE_PARTS',
      'DRIVER_BATA',
      'OTHER',
    ]),
    VEHICLE: Object.freeze(['INSURANCE', 'SERVICE', 'FC', 'EMI', 'OTHER']),
  });

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Expense.#model) {
      return Expense.#model;
    }

    const schema = new mongoose.Schema(
      {
        date: {
          type: Date,
          required: [true, 'Expense date is required'],
        },
        kind: {
          type: String,
          enum: Expense.KINDS,
          required: [true, 'Expense kind is required'],
        },
        category: {
          type: String,
          enum: Expense.CATEGORIES,
          required: [true, 'Expense category is required'],
        },
        amount: {
          type: Number,
          required: [true, 'Amount is required'],
          min: [0.01, 'Amount must be greater than zero'],
        },
        vehicle: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vehicle',
          default: null,
        },
        litres: {
          type: Number,
          min: [0, 'Litres must be zero or more'],
          default: 0,
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

    schema.index({ date: -1 });

    Expense.#model = mongoose.model('Expense', schema);
    return Expense.#model;
  }
}

export default Expense;
