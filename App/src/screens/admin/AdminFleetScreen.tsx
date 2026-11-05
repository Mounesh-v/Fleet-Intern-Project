// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Screen,
  Card,
  Field,
  PrimaryButton,
  Badge,
  SectionTitle,
  EmptyState,
  Loading,
} from '../../components/UI';
import { C, S, R, T } from '../../themeCompat';
import {
  fetchVehicles,
  createVehicle,
  removeVehicle,
  fetchDrivers,
  createDriver,
  removeDriver,
  fetchDriverAccounts,
  createDriverAccount,
  resetDriverPassword,
  assignDriverVehicle,
  fetchWorkEntries,
  formatMoney,
  formatDay,
  typeLabel,
  entryQuantity,
} from '../../services/adminService';

const VEHICLE_TYPES = ['JCB', 'TIPPER', 'TATA_ACE'];

/**
 * AdminFleetScreen — vehicles and drivers master data.
 *
 * Drivers tab: tap a driver to open their details — view profile,
 * assign/change the vehicle they drive, and manage the admin-created
 * login (drivers cannot sign up anywhere; backend has no register route).
 */
export default function AdminFleetScreen() {
  const [tab, setTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loginModal, setLoginModal] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, d, a] = await Promise.all([
        fetchVehicles(),
        fetchDrivers(),
        fetchDriverAccounts(),
      ]);
      setVehicles(v.vehicles || []);
      setDrivers(d.drivers || []);
      setAccounts(a.accounts || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load fleet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accountFor = useCallback(
    driver =>
      accounts.find(
        a => a.driverId && String(a.driverId) === String(driver._id),
      ) || null,
    [accounts],
  );

  // Always show the freshest copy of the open driver (after assign/login).
  const detailDriver =
    drivers.find(d => String(d._id) === String(detailId)) || null;

  const confirmDeleteVehicle = vehicle => {
    Alert.alert(
      'Delete vehicle',
      `Remove ${vehicle.registrationNo} permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeVehicle(vehicle._id);
              load();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const confirmDeleteDriver = driver => {
    Alert.alert(
      'Delete driver',
      `Remove ${driver.name} permanently? The login account (if any) stays but stops matching a driver.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeDriver(driver._id);
              if (String(detailId) === String(driver._id)) setDetailId(null);
              load();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <Loading label="Loading fleet…" />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MASTER DATA</Text>
          <Text style={styles.title}>Fleet</Text>
          <Text style={styles.subtitle}>
            Assign vehicles from a driver's details. Logins are created by you only.
          </Text>
        </View>

        {/* Segmented control */}
        <View style={styles.segment}>
          {['vehicles', 'drivers'].map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.segmentItem, tab === key && styles.segmentItemActive]}
              onPress={() => setTab(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>
                {key === 'vehicles' ? `Vehicles (${vehicles.length})` : `Drivers (${drivers.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        <SectionTitle
          title={tab === 'vehicles' ? 'Vehicles' : 'Drivers'}
          action="+ Add"
          onAction={() => setModalOpen(true)}
        />

        {tab === 'vehicles' ? (
          vehicles.length === 0 ? (
            <Card>
              <EmptyState title="No vehicles" subtitle="Tap + Add to register the first vehicle." />
            </Card>
          ) : (
            vehicles.map(vehicle => (
              <Card key={vehicle._id} style={styles.row}>
                <TouchableOpacity
                  style={styles.rowBody}
                  onLongPress={() => confirmDeleteVehicle(vehicle)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{vehicle.registrationNo}</Text>
                    <Text style={styles.rowSub}>
                      {vehicle.type}
                      {vehicle.brand ? ` · ${vehicle.brand}` : ''}
                      {vehicle.model ? ` ${vehicle.model}` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={vehicle.status} />
                </TouchableOpacity>
              </Card>
            ))
          )
        ) : drivers.length === 0 ? (
          <Card>
            <EmptyState title="No drivers" subtitle="Tap + Add to register the first driver." />
          </Card>
        ) : (
          drivers.map(driver => {
            const account = accountFor(driver);
            return (
              <Card key={driver._id} style={styles.row}>
                <TouchableOpacity
                  style={styles.rowBody}
                  onPress={() => setDetailId(driver._id)}
                  onLongPress={() => confirmDeleteDriver(driver)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{driver.name}</Text>
                    <Text style={styles.rowSub}>
                      {driver.employeeId || 'No ID'}
                      {driver.phone ? ` · ${driver.phone}` : ''}
                    </Text>
                    <Text
                      style={[
                        styles.vehicleLine,
                        driver.vehicle ? styles.vehicleYes : styles.vehicleNo,
                      ]}
                    >
                      {driver.vehicle
                        ? `${driver.vehicle.registrationNo} · ${typeLabel(driver.vehicle.type)}`
                        : 'No vehicle — tap to assign'}
                    </Text>
                    <Text style={[styles.loginLine, account ? styles.loginYes : styles.loginNo]}>
                      {account ? `Login: ${account.username}` : 'No login yet'}
                    </Text>
                  </View>
                  <StatusBadge status={driver.status} />
                </TouchableOpacity>
              </Card>
            );
          })
        )}

        <Text style={styles.hint}>
          Tap a driver for details &amp; vehicle assignment · long-press to delete
        </Text>
      </ScrollView>

      <AddModal
        open={modalOpen}
        tab={tab}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />

      {detailDriver ? (
        <DriverDetailModal
          driver={detailDriver}
          account={accountFor(detailDriver)}
          onClose={() => setDetailId(null)}
          onAssign={() => setPickerOpen(true)}
          onLogin={state => setLoginModal(state)}
        />
      ) : null}

      {pickerOpen && detailDriver ? (
        <VehiclePickerModal
          driver={detailDriver}
          vehicles={vehicles}
          onClose={() => setPickerOpen(false)}
          onAssigned={() => {
            setPickerOpen(false);
            load();
          }}
        />
      ) : null}

      <LoginModal
        state={loginModal}
        onClose={() => setLoginModal(null)}
        onSaved={() => {
          setLoginModal(null);
          load();
        }}
      />
    </Screen>
  );
}

function StatusBadge({ status }) {
  const tone =
    status === 'ACTIVE' ? 'green' : status === 'MAINTENANCE' ? 'orange' : 'red';
  return <Badge label={status || '—'} tone={tone} />;
}

/**
 * DriverDetailModal — the driver's details: profile, assigned vehicle
 * (with assign/change action), admin login, and recent work entries.
 * The driver prop is re-derived from the list after every change, so
 * the modal always shows fresh data while staying open.
 */
function DriverDetailModal({ driver, account, onClose, onAssign, onLogin }) {
  const [entries, setEntries] = useState(null);
  const driverId = String(driver._id);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    fetchWorkEntries(`?driver=${driverId}&limit=5`)
      .then(data => {
        if (alive) setEntries(data.entries || []);
      })
      .catch(() => {
        if (alive) setEntries([]);
      });
    return () => {
      alive = false;
    };
  }, [driverId]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalShell}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.modalCard}>
          <View style={styles.detailHead}>
            <View style={styles.detailHeadMain}>
              <Text style={styles.modalTitle}>{driver.name}</Text>
              <Text style={styles.detailSub}>
                {driver.employeeId || 'No employee ID'}
                {driver.phone ? ` · ${driver.phone}` : ''}
              </Text>
            </View>
            <StatusBadge status={driver.status} />
          </View>

          <InfoLine label="License" value={driver.licenseNo} />
          <InfoLine label="Joined" value={formatDay(driver.joinedAt)} />
          {driver.notes ? <InfoLine label="Notes" value={driver.notes} /> : null}

          <View style={styles.divider} />
          <Text style={styles.detailSection}>ASSIGNED VEHICLE</Text>
          {driver.vehicle ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>{driver.vehicle.registrationNo}</Text>
              <Text style={styles.infoBoxMeta}>
                {typeLabel(driver.vehicle.type)}
                {driver.vehicle.brand ? ` · ${driver.vehicle.brand}` : ''}
                {driver.vehicle.model ? ` ${driver.vehicle.model}` : ''}
                {' · '}
                {driver.vehicle.status || '—'}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyNote}>No vehicle assigned yet.</Text>
          )}
          <View style={styles.btnWrap}>
            <PrimaryButton
              title={driver.vehicle ? 'Change vehicle' : 'Assign vehicle'}
              onPress={onAssign}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.detailSection}>LOGIN</Text>
          {account ? (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>{account.username}</Text>
                <Text style={styles.infoBoxMeta}>
                  {account.status || 'ACTIVE'}
                  {account.lastLogin
                    ? ` · last login ${formatDay(account.lastLogin)}`
                    : ' · never signed in'}
                </Text>
              </View>
              <View style={styles.btnWrap}>
                <PrimaryButton
                  title="Reset password"
                  onPress={() => onLogin({ mode: 'reset', driver, account })}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.emptyNote}>
                No login yet — only you can create credentials.
              </Text>
              <View style={styles.btnWrap}>
                <PrimaryButton
                  title="Create login"
                  onPress={() => onLogin({ mode: 'create', driver, account: null })}
                />
              </View>
            </>
          )}

          <View style={styles.divider} />
          <Text style={styles.detailSection}>RECENT WORK</Text>
          {entries === null ? (
            <Text style={styles.emptyNote}>Loading…</Text>
          ) : entries.length === 0 ? (
            <Text style={styles.emptyNote}>No work entries yet.</Text>
          ) : (
            entries.map(entry => (
              <View key={entry._id} style={styles.entryRow}>
                <View style={styles.entryMain}>
                  <Text style={styles.entryTitle}>
                    {formatDay(entry.date)} · {entryQuantity(entry)}
                  </Text>
                  <Text style={styles.entrySub}>
                    {entry.vehicle?.registrationNo || '—'}
                    {entry.customer?.name ? ` · ${entry.customer.name}` : ''}
                    {entry.material?.name ? ` · ${entry.material.name}` : ''}
                  </Text>
                </View>
                <Text style={styles.entryAmount}>{formatMoney(entry.billedAmount)}</Text>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

/**
 * VehiclePickerModal — pick which vehicle a driver gets, or remove
 * the current assignment. Reassignment never rewrites past work
 * entries (they keep their own vehicle snapshot).
 */
function VehiclePickerModal({ driver, vehicles, onClose, onAssigned }) {
  const [busy, setBusy] = useState(false);
  const currentId = driver.vehicle ? String(driver.vehicle._id) : null;

  const assign = async vehicleId => {
    if (busy) return;
    setBusy(true);
    try {
      await assignDriverVehicle(driver._id, vehicleId);
      onAssigned();
    } catch (err) {
      Alert.alert('Error', err.message);
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalShell}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.modalCard}>
          <Text style={styles.modalTitle}>Assign vehicle</Text>
          <Text style={styles.sectionNote}>
            Pick a vehicle for {driver.name}. Changing it later keeps all past
            work entries unchanged.
          </Text>

          {currentId ? (
            <TouchableOpacity
              style={[styles.pickRow, styles.pickRemoveRow]}
              onPress={() => assign(null)}
              disabled={busy}
              activeOpacity={0.75}
            >
              <Text style={styles.pickRemoveText}>Remove current assignment</Text>
            </TouchableOpacity>
          ) : null}

          {vehicles.length === 0 ? (
            <Text style={styles.emptyNote}>No vehicles registered yet.</Text>
          ) : (
            vehicles.map(vehicle => {
              const isCurrent = String(vehicle._id) === currentId;
              return (
                <TouchableOpacity
                  key={vehicle._id}
                  style={[styles.pickRow, isCurrent && styles.pickRowCurrent]}
                  onPress={() => {
                    if (!isCurrent) assign(vehicle._id);
                  }}
                  disabled={busy || isCurrent}
                  activeOpacity={0.75}
                >
                  <View style={styles.entryMain}>
                    <Text style={styles.pickReg}>{vehicle.registrationNo}</Text>
                    <Text style={styles.pickMeta}>
                      {typeLabel(vehicle.type)}
                      {vehicle.brand ? ` · ${vehicle.brand}` : ''}
                      {vehicle.model ? ` ${vehicle.model}` : ''}
                      {' · '}
                      {vehicle.status || '—'}
                    </Text>
                    {isCurrent ? <Text style={styles.pickCurrentTag}>CURRENT</Text> : null}
                  </View>
                  <StatusBadge status={vehicle.status} />
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Add form modal — vehicles or drivers (+ optional login for new drivers). */
function AddModal({ open, tab, onClose, onSaved }) {
  const [regNo, setRegNo] = useState('');
  const [type, setType] = useState('JCB');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRegNo('');
      setType('JCB');
      setBrand('');
      setModel('');
      setName('');
      setPhone('');
      setEmployeeId('');
      setUsername('');
      setPassword('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      if (tab === 'vehicles') {
        if (!regNo.trim()) {
          setError('Registration number is required.');
          setBusy(false);
          return;
        }
        await createVehicle({
          registrationNo: regNo.trim(),
          type,
          brand: brand.trim(),
          model: model.trim(),
        });
        onSaved();
        return;
      }

      // Drivers: create record, then optional admin-created login.
      if (!name.trim()) {
        setError('Driver name is required.');
        setBusy(false);
        return;
      }
      const wantsLogin = username.trim().length > 0;
      if (wantsLogin && password.length < 6) {
        setError('Password must be at least 6 characters.');
        setBusy(false);
        return;
      }

      const created = await createDriver({
        name: name.trim(),
        phone: phone.trim(),
        employeeId: employeeId.trim() || null,
      });

      if (wantsLogin) {
        await createDriverAccount({
          username: username.trim(),
          password,
          driverId: created.driver._id,
        });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalShell}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {tab === 'vehicles' ? 'Add vehicle' : 'Add driver'}
          </Text>

          {tab === 'vehicles' ? (
            <>
              <Field
                label="Registration number"
                value={regNo}
                onChangeText={setRegNo}
                placeholder="MH12 AB 1234"
                autoCapitalize="characters"
              />
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {VEHICLE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, type === t && styles.typeChipActive]}
                    onPress={() => setType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                      {t === 'TATA_ACE' ? 'Ace' : t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="JCB / Tata" />
              <Field label="Model" value={model} onChangeText={setModel} placeholder="3DX" />
            </>
          ) : (
            <>
              <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
                keyboardType="phone-pad"
              />
              <Field
                label="Employee ID"
                value={employeeId}
                onChangeText={setEmployeeId}
                placeholder="EMP007"
                autoCapitalize="characters"
              />

              <View style={styles.divider} />
              <Text style={styles.sectionNote}>
                Login credentials (optional) — only you can create these.
              </Text>
              <Field
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Leave empty for no login"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder={username.trim() ? 'Min 6 characters' : 'Required with username'}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title={busy ? 'Saving…' : 'Save'}
            onPress={submit}
            disabled={busy}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * LoginModal — create login credentials for a driver, or reset
 * an existing account's password. Both actions are admin-only
 * server-side (POST /auth/create-driver, PUT /auth/reset-password).
 */
function LoginModal({ state, onClose, onSaved }) {
  const open = Boolean(state);
  const mode = state?.mode || 'create';
  const driver = state?.driver;
  const account = state?.account;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUsername(mode === 'create' && driver ? suggestUsername(driver) : '');
      setPassword('');
      setError('');
      setBusy(false);
    }
  }, [open, mode, driver]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'create') {
        if (!username.trim()) {
          setError('Username is required.');
          setBusy(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setBusy(false);
          return;
        }
        await createDriverAccount({
          username: username.trim(),
          password,
          driverId: driver._id,
        });
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setBusy(false);
          return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
          setError('Password needs an uppercase letter, a lowercase letter, and a number.');
          setBusy(false);
          return;
        }
        await resetDriverPassword(account._id, password);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalShell}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {mode === 'create' ? 'Create login' : 'Reset password'}
          </Text>
          <Text style={styles.sectionNote}>
            {mode === 'create'
              ? `Credentials for ${driver?.name || 'driver'} — they can only sign in with these.`
              : `New password for ${account?.username || 'account'} — existing sessions will be signed out.`}
          </Text>

          {mode === 'create' ? (
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="driver7"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
          <Field
            label={mode === 'create' ? 'Password' : 'New password'}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'create' ? 'Min 6 characters' : 'Upper + lower + number'}
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title={busy ? 'Saving…' : mode === 'create' ? 'Create login' : 'Reset password'}
            onPress={submit}
            disabled={busy}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Suggest a username like "ramesh.p" from the driver name. */
function suggestUsername(driver) {
  const base = String(driver?.name || 'driver')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return base || 'driver';
}

const styles = StyleSheet.create({
  content: { paddingBottom: S.xxl },
  header: { marginBottom: S.lg },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.accentDark },
  title: { ...T.heading, color: C.primary, marginTop: 4, letterSpacing: -0.6 },
  subtitle: { marginTop: 4, fontSize: 12, color: C.textSecondary },
  segment: {
    flexDirection: 'row',
    backgroundColor: C.softOrange,
    borderRadius: R.md,
    padding: 4,
    marginBottom: S.lg,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: S.sm,
    borderRadius: R.sm,
    alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: C.surface },
  segmentText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  segmentTextActive: { color: C.primary },
  row: { paddingVertical: S.md, marginBottom: S.sm },
  rowBody: { flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  rowSub: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  vehicleLine: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  vehicleYes: { color: C.primary },
  vehicleNo: { color: C.accentDark },
  loginLine: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  loginYes: { color: C.success },
  loginNo: { color: C.textMuted },
  hint: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: S.md,
  },
  errorCard: { borderColor: C.danger, marginBottom: S.sm },
  errorText: { fontSize: 13, color: C.danger, fontWeight: '600', marginBottom: S.sm },
  modalShell: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 37, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    padding: S.xl,
    paddingBottom: S.xxl,
    maxHeight: '90%',
  },
  modalTitle: { ...T.title, color: C.primary, marginBottom: S.sm },
  sectionNote: {
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: S.md,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: S.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: S.sm,
  },
  typeRow: { flexDirection: 'row', gap: S.sm, marginBottom: S.md },
  typeChip: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  typeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeChipText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  typeChipTextActive: { color: C.white },
  cancelBtn: { alignItems: 'center', paddingVertical: S.md },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },

  // Driver detail modal
  detailHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: S.sm },
  detailHeadMain: { flex: 1, paddingRight: S.sm },
  detailSub: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: S.sm,
  },
  infoLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  infoValue: {
    fontSize: 13,
    color: C.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailSection: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.accentDark,
    marginBottom: S.sm,
  },
  infoBox: {
    backgroundColor: C.softOrange,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
  },
  infoBoxTitle: { fontSize: 15, fontWeight: '800', color: C.primary },
  infoBoxMeta: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  emptyNote: { fontSize: 13, color: C.textSecondary, marginBottom: S.sm, lineHeight: 18 },
  btnWrap: { marginBottom: S.md },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  entryMain: { flex: 1, paddingRight: S.sm },
  entryTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  entrySub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  entryAmount: { fontSize: 13, fontWeight: '800', color: C.success },

  // Vehicle picker modal
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
    backgroundColor: C.surface,
  },
  pickRowCurrent: { borderColor: C.primary, backgroundColor: C.softOrange },
  pickReg: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  pickMeta: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  pickCurrentTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.primary,
    marginTop: 4,
  },
  pickRemoveRow: { borderColor: C.danger },
  pickRemoveText: { fontSize: 13, fontWeight: '700', color: C.danger, textAlign: 'center' },
});
