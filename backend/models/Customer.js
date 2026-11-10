import mongoose from 'mongoose';

/**
 * Customer — customer master record (billed via work entries).
 *
 * OOP concepts:
 * - Lazy singleton model via getModel(), mirroring User.
 */
class Customer {
  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Customer.#model) {
      return Customer.#model;
    }

    const schema = new mongoose.Schema(
      {
        name: {
          type: String,
          required: [true, 'Customer name is required'],
          trim: true,
          maxlength: [80, 'Name must be at most 80 characters'],
        },
        phone: {
          type: String,
          trim: true,
          default: '',
          maxlength: [15, 'Phone must be at most 15 characters'],
        },
        address: {
          type: String,
          trim: true,
          default: '',
          maxlength: [200, 'Address must be at most 200 characters'],
        },
        gstNo: {
          type: String,
          trim: true,
          uppercase: true,
          default: '',
          maxlength: [20, 'GST number must be at most 20 characters'],
        },
        status: {
          type: String,
          enum: ['ACTIVE', 'INACTIVE'],
          default: 'ACTIVE',
        },
        openingBalance: {
          type: Number,
          default: 0,
        },
      },
      {
        timestamps: true,
        toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
        toObject: { transform(_doc, ret) { delete ret.__v; return ret; } },
      },
    );

    Customer.#model = mongoose.model('Customer', schema);
    return Customer.#model;
  }
}

export default Customer;
