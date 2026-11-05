import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.fleetmanagement.auth';

/**
 * Stores the JWT in the device Keychain/Keystore —
 * never in plain AsyncStorage.
 */
export async function storeToken(token) {
  if (!token) {
    throw new Error('token is required');
  }
  await Keychain.setGenericPassword('jwt', token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getToken() {
  try {
    const credentials = await Keychain.getGenericPassword({ service: SERVICE });
    if (credentials && credentials.password) {
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearToken() {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // Already cleared or unavailable — nothing to do.
  }
}
