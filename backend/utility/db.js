import mongoose from 'mongoose';
import env from './env.js';

/**
 * Database — MongoDB connection lifecycle.
 *
 * OOP concepts:
 * - Encapsulation: connection details and open/close logic in one class.
 * - Singleton: only one connection manager is exported.
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Open a Mongoose connection.
   * @param {string} [uri] - Defaults to env.mongoUri
   * @returns {Promise<typeof mongoose.connection>}
   */
  async connect(uri = env.mongoUri) {
    mongoose.set('strictQuery', true);
    this.connection = await mongoose.connect(uri);
    return this.connection;
  }

  /** Close the current connection (graceful shutdown / tests). */
  async disconnect() {
    await mongoose.disconnect();
    this.connection = null;
  }
}

const database = new Database();
export default database;
