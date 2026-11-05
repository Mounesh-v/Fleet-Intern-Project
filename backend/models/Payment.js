import mongoose from 'mongoose';

/**
 * Payment — money received from a customer against their ledger.
 *
 * OOP concepts:
 * - Class constants: MODES are a fixed public vocabulary.
 * - Lazy singleton model via getModel(), mirroring User.
 */
class Payment {
  static MODES = Object.freeze(['CASH', 'UPI', 'BANK', 'CHEQUE']);

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Payment.#model) {
      return Payment.#model;
    }

    const schema = new mongoose.Schema(
      {
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
          required: [true, 'Customer is required'],
        },
        amount: {
          type: Number,
          required: [true, 'Amount is required'],
          min: [0.01, 'Amount must be greater than zero'],
        },
        date: {
          type: Date,
          required: [true, 'Payment date is required'],
        },
        mode: {
          type: String,
          enum: Payment.MODES,
          default: 'CASH',
        },
        reference: {
          type: String,
          trim: true,
          default: '',
          maxlength: [60, 'Reference must be at most 60 characters'],
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

    schema.index({ customer: 1, date: -1 });

    Payment.#model = mongoose.model('Payment', schema);
    return Payment.#model;
  }
}

export default Payment;
