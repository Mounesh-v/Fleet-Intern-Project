import mongoose from 'mongoose';

/**
 * Counter — atomic per-key sequence generator for human-readable
 * numbers (work-entry bill numbers: BILL-2026-0001).
 *
 * OOP concepts:
 * - Lazy singleton model via getModel(), mirroring User.
 * - Atomic upsert + $inc so concurrent creates never share a number.
 */
class Counter {
  static #model = null;

  /** Lazily build and cache the Mongoose model (process-wide singleton). */
  static getModel() {
    if (Counter.#model) {
      return Counter.#model;
    }

    const schema = new mongoose.Schema(
      {
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 },
      },
      { versionKey: false },
    );

    Counter.#model = mongoose.model('Counter', schema);
    return Counter.#model;
  }

  /** Atomically increment and return the next sequence for a key. */
  static async next(key) {
    const Model = Counter.getModel();
    const doc = await Model.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return doc.seq;
  }
}

export default Counter;
