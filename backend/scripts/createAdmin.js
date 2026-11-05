import database from '../utility/db.js';
import env from '../utility/env.js';
import User from '../models/User.js';

/**
 * createAdmin — seeds the initial ADMIN account from environment variables.
 *
 * OOP notes:
 * - Uses User model + Env singleton; no hardcoded production credentials.
 * - Prevents duplicate Admin creation (idempotent script).
 *
 * Usage: npm run create-admin   (from backend/)
 */
async function createAdmin() {
  env.assertEnv();

  if (!env.adminPassword) {
    throw new Error('ADMIN_PASSWORD is not set in the environment');
  }
  if (env.adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  await database.connect();

  try {
    const username = env.adminUsername.trim().toLowerCase();
    const UserModel = User.getModel();
    const existing = await UserModel.findOne({ username });

    if (existing) {
      if (existing.role === 'ADMIN') {
        console.log(`Admin account "${username}" already exists — skipping.`);
        return { created: false, username };
      }
      throw new Error(
        `Username "${username}" is already taken by a non-admin account`,
      );
    }

    await UserModel.create({
      username,
      password: env.adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      driverId: null,
    });

    console.log(`Admin account "${username}" created successfully.`);
    return { created: true, username };
  } finally {
    await database.disconnect();
  }
}

import { pathToFileURL } from 'node:url';

// Run only when executed directly (not when imported).
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  createAdmin()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}

export { createAdmin };
