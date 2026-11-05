import mongoose from 'mongoose';

/**
 * Quarry — quarry / supplier master record (source of materials).
 *
 * OOP concepts:
 * - Lazy singleton model via getModel(), mirroring User.
 */
class Quarry {
  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Quarry.#model) {
      return Quarry.#model;
    }

    const schema = new mongoose.Schema(
      {
        name: {
          type: String,
          required: [true, 'Quarry name is required'],
          trim: true,
          maxlength: [80, 'Name must be at most 80 characters'],
        },
        location: {
          type: String,
          trim: true,
          default: '',
          maxlength: [120, 'Location must be at most 120 characters'],
        },
        contactPerson: {
          type: String,
          trim: true,
          default: '',
          maxlength: [60, 'Contact person must be at most 60 characters'],
        },
        phone: {
          type: String,
          trim: true,
          default: '',
          maxlength: [15, 'Phone must be at most 15 characters'],
        },
        status: {
          type: String,
          enum: ['ACTIVE', 'INACTIVE'],
          default: 'ACTIVE',
        },
      },
      {
        timestamps: true,
        toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
        toObject: { transform(_doc, ret) { delete ret.__v; return ret; } },
      },
    );

    Quarry.#model = mongoose.model('Quarry', schema);
    return Quarry.#model;
  }
}

export default Quarry;
