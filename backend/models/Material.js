import mongoose from 'mongoose';

/**
 * Material — material master record (M-sand, jelly, soil, ...).
 *
 * OOP concepts:
 * - Class constants: UNITS are a fixed public vocabulary.
 * - Lazy singleton model via getModel(), mirroring User.
 */
class Material {
  static UNITS = Object.freeze(['LOAD', 'TONNE', 'CUBIC_METER']);

  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Material.#model) {
      return Material.#model;
    }

    const schema = new mongoose.Schema(
      {
        name: {
          type: String,
          required: [true, 'Material name is required'],
          unique: true,
          trim: true,
          maxlength: [60, 'Name must be at most 60 characters'],
        },
        unit: {
          type: String,
          enum: Material.UNITS,
          default: 'LOAD',
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

    Material.#model = mongoose.model('Material', schema);
    return Material.#model;
  }
}

export default Material;
