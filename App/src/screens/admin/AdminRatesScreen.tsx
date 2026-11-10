// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Screen,
  Field,
  Chip,
  PrimaryButton,
  Badge,
  EmptyState,
  Loading,
} from '../../components/UI';
import SheetModal from '../../components/SheetModal';
import { useCustomAlert } from '../../components/CustomAlert';
import {
  fetchRates,
  createRate,
  removeRate,
  fetchMaterials,
  fetchCustomers,
  formatMoney,
  formatDay,
  typeLabel,
} from '../../services/adminService';

const VEHICLE_TYPES = ['JCB', 'TIPPER', 'TATA_ACE'];
// Paired vocabulary enforced by the backend (JCB→HOUR, TIPPER→LOAD,
// TATA_ACE→TRIP) — picking a vehicle type sets the rate type.
const RATE_TYPE_FOR = { JCB: 'HOUR', TIPPER: 'LOAD', TATA_ACE: 'TRIP' };
const RATE_UNIT_LABEL = { HOUR: 'per hour', LOAD: 'per load', TRIP: 'per trip' };

const pad = value => String(value).padStart(2, '0');
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * AdminRatesScreen — rate cards per vehicle type (optionally scoped to
 * a material or customer), from GET/POST/DELETE /api/admin/rates.
 */
export default function AdminRatesScreen({ navigation }) {
  const [rates, setRates] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vehicleType, setVehicleType] = useState('JCB');
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(isoToday());
  const [materialId, setMaterialId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const { alert, alertNode } = useCustomAlert();

  const load = useCallback(async () => {
    try {
      const [r, m, c] = await Promise.all([
        fetchRates(),
        fetchMaterials(),
        fetchCustomers(),
      ]);
      setRates(r.rates || []);
      setMaterials(m.materials || []);
      setCustomers(c.customers || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load rates.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setVehicleType('JCB');
    setAmount('');
    setEffectiveFrom(isoToday());
    setMaterialId('');
    setCustomerId('');
    setBusy(false);
    setAddOpen(true);
  };

  const save = async () => {
    if (busy) return;
    const value = Number(amount);
    if (!amount.trim() || Number.isNaN(value) || value < 0) {
      alert('Add rate', 'Enter a valid amount (zero or more).', {
        type: 'warning',
      });
      return;
    }
    if (Number.isNaN(Date.parse(effectiveFrom.trim()))) {
      alert('Add rate', 'Enter a valid date, e.g. ' + isoToday(), {
        type: 'warning',
      });
      return;
    }
    setBusy(true);
    try {
      await createRate({
        vehicleType,
        rateType: RATE_TYPE_FOR[vehicleType],
        amount: value,
        material: materialId || null,
        customer: customerId || null,
        effectiveFrom: effectiveFrom.trim(),
        active: true,
      });
      setAddOpen(false);
      alert('Saved', 'Rate created successfully.', { type: 'success' });
      load();
    } catch (err) {
      alert('Add rate', err.message || 'Could not save.', { type: 'error' });
      setBusy(false);
    }
  };

  const confirmDelete = rate => {
    alert(
      'Delete rate',
      `${typeLabel(rate.vehicleType)} · ${
        RATE_UNIT_LABEL[rate.rateType] || rate.rateType
      } · ${formatMoney(rate.amount)} — this cannot be undone.`,
      {
        type: 'error',
        cancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await removeRate(rate._id);
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  if (loading) {
    return <Loading label="Loading rates…" />;
  }

  const scopeOf = rate =>
    [rate.material?.name, rate.customer?.name].filter(Boolean).join(' · ') ||
    'Default (all work)';

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#182F50"
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#182F50" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Rate management</Text>
            <Text style={styles.subtitle}>
              {`${rates.length} ${rates.length === 1 ? 'rate' : 'rates'} in total`}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={17} color="#182F50" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {rates.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              title="No rates yet"
              subtitle="Add a rate per vehicle type to start billing work automatically."
            />
          </View>
        ) : (
          rates.map(rate => (
            <View key={rate._id} style={styles.rowCard}>
              <TouchableOpacity
                style={styles.rowBody}
                onPress={() => confirmDelete(rate)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={styles.rowMain}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle}>
                      {typeLabel(rate.vehicleType)}
                      {' · '}
                      {RATE_UNIT_LABEL[rate.rateType] || rate.rateType}
                    </Text>
                    {rate.active === false ? (
                      <Badge label="INACTIVE" tone="red" />
                    ) : null}
                  </View>
                  <Text style={styles.rowSub}>{scopeOf(rate)}</Text>
                  <Text style={styles.rowMeta}>
                    {formatMoney(rate.amount)} · from {formatDay(rate.effectiveFrom)}
                  </Text>
                </View>
                <Ionicons name="trash-outline" size={16} color="#C43D35" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.hint}>Tap a rate to delete it</Text>
      </ScrollView>

      <SheetModal visible={addOpen} onClose={() => setAddOpen(false)} title="Add rate">
        <Text style={styles.fieldLabel}>Vehicle type</Text>
        <View style={styles.chipRow}>
          {VEHICLE_TYPES.map(type => (
            <Chip
              key={type}
              label={type === 'TATA_ACE' ? 'Ace' : type}
              selected={vehicleType === type}
              onPress={() => setVehicleType(type)}
              tone="orange"
            />
          ))}
        </View>
        <Text style={styles.pairHint}>
          {`${typeLabel(vehicleType)} bills ${
            RATE_UNIT_LABEL[RATE_TYPE_FOR[vehicleType]]
          }`}
        </Text>

        <Field
          label="Amount (₹)"
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 1500"
          keyboardType="decimal-pad"
        />
        <Field
          label="Effective from"
          value={effectiveFrom}
          onChangeText={setEffectiveFrom}
          placeholder="YYYY-MM-DD"
        />

        {materials.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>Material scope (optional)</Text>
            <View style={styles.chipRow}>
              <Chip
                label="All materials"
                selected={!materialId}
                onPress={() => setMaterialId('')}
                tone="orange"
              />
              {materials.map(material => (
                <Chip
                  key={material._id}
                  label={material.name}
                  selected={materialId === material._id}
                  onPress={() => setMaterialId(material._id)}
                  tone="orange"
                />
              ))}
            </View>
          </>
        ) : null}

        {customers.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>Customer scope (optional)</Text>
            <View style={styles.chipRow}>
              <Chip
                label="All customers"
                selected={!customerId}
                onPress={() => setCustomerId('')}
                tone="orange"
              />
              {customers.map(customer => (
                <Chip
                  key={customer._id}
                  label={customer.name}
                  selected={customerId === customer._id}
                  onPress={() => setCustomerId(customer._id)}
                  tone="orange"
                />
              ))}
            </View>
          </>
        ) : null}

        <PrimaryButton
          title={busy ? 'Saving…' : 'Save rate'}
          onPress={save}
          disabled={busy}
        />
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setAddOpen(false)}
          hitSlop={8}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SheetModal>
      {alertNode}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: '#F6F1E7',
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDFA',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E0D2',
  },
  back: {
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#182F50',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#85858A',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F5B923',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#182F50',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7B4AF',
    backgroundColor: '#FCEAEA',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C43D35',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    backgroundColor: '#FFFDFA',
    padding: 16,
  },
  rowCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    backgroundColor: '#FFFDFA',
    overflow: 'hidden',
  },
  rowBody: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowMain: {
    flex: 1,
    paddingRight: 10,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#292D32',
    flexShrink: 1,
  },
  rowSub: {
    fontSize: 11.5,
    color: '#85858A',
    marginTop: 3,
  },
  rowMeta: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#33507A',
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    color: '#85858A',
    textAlign: 'center',
    marginTop: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#292D32',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  pairHint: {
    fontSize: 11.5,
    color: '#85858A',
    marginBottom: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#85858A',
  },
});
