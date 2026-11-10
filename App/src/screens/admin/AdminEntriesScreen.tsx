// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Screen,
  Card,
  Chip,
  Badge,
  EmptyState,
  Loading,
} from '../../components/UI';
import {
  Dropdown,
  DatePickerField,
  LabeledInput,
  SearchableSelect,
  SectionCard,
  StepIndicator,
  SubmitButton,
} from '../../components/FormControls';
import { useCustomAlert } from '../../components/CustomAlert';
import { C, S, R, T } from '../../themeCompat';
import {
  fetchWorkEntries,
  setWorkEntryStatus,
  removeWorkEntry,
  removeWorkEntries,
  fetchDrivers,
  fetchVehicles,
  fetchCustomers,
  fetchMaterials,
  fetchQuarries,
  createWorkEntry,
  formatMoney,
  formatDay,
  typeLabel,
  entryQuantity,
} from '../../services/adminService';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'LOCKED', label: 'Locked' },
];

const EXPENSE_CATEGORIES = ['Fuel', 'Food', 'Maintenance', 'Toll', 'Other'];

const pad = value => String(value).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const toIsoDate = value => {
  const [day, month, year] = value.split('/');
  return `${year}-${pad(month)}-${pad(day)}`;
};
const isAmount = value => value.trim() === '' || /^\d+(\.\d+)?$/.test(value.trim());

/**
 * AdminEntriesScreen — all work entries in the same layout as the
 * Vehicles screen (white header + yellow Add button, vehicle-style rows
 * with status badges) plus status filter tabs (all / submitted /
 * verified / locked), status transitions (verify / lock / reopen) via
 * the custom alert, and an Add Work form opened from the header or the
 * dashboard's quick action (route param openAdd).
 */
export default function AdminEntriesScreen({ route, navigation }) {
  const [filter, setFilter] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState({});
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const { alert, alertNode } = useCustomAlert();

  const load = useCallback(async () => {
    try {
      const query = filter ? `?status=${filter}&limit=100` : '?limit=100';
      const data = await fetchWorkEntries(query);
      setEntries(data.entries || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load work entries.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  // Dashboard quick action: open Add Work once, then clear the param.
  useEffect(() => {
    if (route?.params?.openAdd) {
      setAddOpen(true);
      navigation.setParams({ openAdd: undefined });
    }
  }, [route?.params?.openAdd, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const changeStatus = (entry, status) => {
    const labels = { VERIFIED: 'Verify', LOCKED: 'Lock', SUBMITTED: 'Reopen' };
    alert(
      `${labels[status]} entry`,
      `${entry.vehicle?.registrationNo || 'Entry'} · ${formatDay(entry.date)}`,
      {
        type: 'info',
        cancel: true,
        confirmText: labels[status],
        onConfirm: async () => {
          try {
            await setWorkEntryStatus(entry._id, status);
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  const deleteEntry = entry => {
    alert(
      'Delete work entry',
      `${entry.vehicle?.registrationNo || 'Entry'} · ${formatDay(entry.date)} — this cannot be undone.`,
      {
        type: 'error',
        cancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await removeWorkEntry(entry._id);
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  const toggleSelect = entry => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[entry._id]) delete next[entry._id];
      else next[entry._id] = true;
      return next;
    });
  };

  const enterSelect = entry => {
    setSelectMode(true);
    setSelected({ [entry._id]: true });
  };

  const handleLongPress = entry => {
    if (selectMode) toggleSelect(entry);
    else enterSelect(entry);
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected({});
  };

  const toggleSelectAll = () => {
    const count = Object.keys(selected).length;
    if (count > 0 && count === entries.length) {
      setSelected({});
      return;
    }
    const next = {};
    entries.forEach(entry => {
      next[entry._id] = true;
    });
    setSelected(next);
  };

  const deleteSelected = () => {
    const ids = Object.keys(selected);
    if (!ids.length) return;
    alert(
      'Delete selected entries',
      `${ids.length} work ${ids.length === 1 ? 'entry' : 'entries'} will be permanently deleted. This cannot be undone.`,
      {
        type: 'error',
        cancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await removeWorkEntries(ids);
            exitSelect();
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  const openActions = entry => {
    const actions = [];
    if (entry.status === 'SUBMITTED') {
      actions.push({ text: 'Verify', onPress: () => changeStatus(entry, 'VERIFIED') });
      actions.push({ text: 'Lock', onPress: () => changeStatus(entry, 'LOCKED') });
    } else if (entry.status === 'VERIFIED') {
      actions.push({ text: 'Lock', onPress: () => changeStatus(entry, 'LOCKED') });
      actions.push({ text: 'Reopen', onPress: () => changeStatus(entry, 'SUBMITTED') });
    } else {
      actions.push({ text: 'Reopen', onPress: () => changeStatus(entry, 'SUBMITTED') });
    }
    const first = actions[0];
    const second = actions[1];
    alert(
      `${entry.vehicle?.registrationNo || 'Work entry'} · ${entryQuantity(entry)}`,
      `${entry.driver?.name || '—'} · ${formatMoney(entry.billedAmount)}`,
      {
        type: 'info',
        cancel: true,
        confirmText: first.text,
        onConfirm: first.onPress,
        extraText: second ? second.text : '',
        onExtra: second ? second.onPress : undefined,
        dangerText: 'Delete',
        onDanger: () => deleteEntry(entry),
      },
    );
  };

  if (loading) {
    return <Loading label="Loading entries…" />;
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, selectMode && styles.contentSelecting]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Work entries</Text>
              <Text style={styles.headerSubtitle}>
                {filter
                  ? `${entries.length} ${
                      FILTERS.find(f => f.key === filter)?.label.toLowerCase()
                    } ${entries.length === 1 ? 'entry' : 'entries'}`
                  : `${entries.length} ${
                      entries.length === 1 ? 'entry' : 'entries'
                    } in total`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={19} color="#182F50" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status filter tabs */}
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <Chip
              key={f.key || 'all'}
              label={f.label}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
              tone="orange"
            />
          ))}
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              title="No entries here"
              subtitle="Drivers' submissions will appear for verification."
            />
          </Card>
        ) : (
          entries.map(entry => (
            <Card
              key={entry._id}
              style={[styles.row, selectMode && selected[entry._id] && styles.rowSelected]}
            >
              <TouchableOpacity
                style={styles.rowBody}
                onPress={() => (selectMode ? toggleSelect(entry) : openActions(entry))}
                onLongPress={() => handleLongPress(entry)}
                delayLongPress={350}
                activeOpacity={0.7}
              >
                {selectMode ? (
                  <View
                    style={[styles.checkCircle, selected[entry._id] && styles.checkCircleOn]}
                  >
                    {selected[entry._id] ? (
                      <Ionicons name="checkmark" size={14} color="#FFFDFA" />
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>
                    {entry.vehicle?.registrationNo || '—'}
                  </Text>
                  <Text style={styles.rowSub}>
                    {formatDay(entry.date)} · {entryQuantity(entry)}
                    {entry.driver?.name ? ` · ${entry.driver.name}` : ''}
                    {entry.customer?.name ? ` · ${entry.customer.name}` : ''}
                    {entry.material?.name ? ` · ${entry.material.name}` : ''}
                  </Text>
                  <View style={styles.rowDriverLine}>
                    <Ionicons name="cash-outline" size={13} color={C.textMuted} />
                    <Text style={styles.rowDriver}>
                      {formatMoney(entry.billedAmount)}
                    </Text>
                    <Text style={styles.rowDriverNone}>
                      {selectMode
                        ? selected[entry._id]
                          ? 'Selected'
                          : 'Tap to select'
                        : 'Tap for actions ›'}
                    </Text>
                  </View>
                </View>
                {selectMode ? null : <StatusPill status={entry.status} />}
              </TouchableOpacity>
            </Card>
          ))
        )}

        <Text style={styles.hint}>
          Tap an entry for actions — verify, lock, reopen or delete{'\n'}
          Long-press an entry to select multiple and delete together
        </Text>
      </ScrollView>

      {selectMode ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={exitSelect} hitSlop={8}>
            <Text style={styles.selectionCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {Object.keys(selected).length} selected
          </Text>
          <TouchableOpacity onPress={toggleSelectAll} hitSlop={8}>
            <Text style={styles.selectionAllText}>
              {Object.keys(selected).length > 0 &&
              Object.keys(selected).length === entries.length
                ? 'Clear all'
                : 'Select all'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={deleteSelected}
            disabled={!Object.keys(selected).length}
            style={[
              styles.selectionDelete,
              !Object.keys(selected).length && styles.selectionDeleteOff,
            ]}
          >
            <Ionicons name="trash" size={15} color="#FFFDFA" />
            <Text style={styles.selectionDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <AddWorkModal visible={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
      {alertNode}
    </Screen>
  );
}

/**
 * AddWorkModal — create a work entry on behalf of a driver against
 * POST /api/admin/work-entries. Options (drivers, vehicles, customers,
 * materials, quarries) load when the modal opens; quantities and billing
 * follow the vehicle type, with rate resolution done server-side.
 */
function AddWorkModal({ visible, onClose, onSaved }) {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quarries, setQuarries] = useState([]);
  const [optionsError, setOptionsError] = useState('');

  const [date, setDate] = useState(today());
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quarryId, setQuarryId] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [dieselAmount, setDieselAmount] = useState('');
  const [dieselLitres, setDieselLitres] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [openSelect, setOpenSelect] = useState('');
  const { alert, alertNode } = useCustomAlert();
  const scrollRef = useRef(null);
  const sectionY = useRef({ a: 0, b: 0, c: 0, d: 0 });
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;

    setDate(today());
    setDriverId('');
    setVehicleId('');
    setCustomerId('');
    setQuantity('');
    setMaterialId('');
    setQuarryId('');
    setMobile('');
    setLocation('');
    setDieselAmount('');
    setDieselLitres('');
    setOtherExpenses('');
    setExpenseCategory('');
    setExpenseDescription('');
    setNotes('');
    setBusy(false);
    setOptionsError('');
    setOpenSelect('');
    setActiveStep(0);
    if (scrollRef.current && scrollRef.current.scrollTo) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }

    Promise.all([
      fetchDrivers(),
      fetchVehicles(),
      fetchCustomers(),
      fetchMaterials(),
      fetchQuarries(),
    ])
      .then(([d, v, c, m, q]) => {
        if (!alive) return;
        const driverList = d.drivers || [];
        const activeDrivers = driverList.filter(item => item.status === 'ACTIVE');
        const vehicleList = v.vehicles || [];
        const activeVehicles = vehicleList.filter(item => item.status === 'ACTIVE');
        setDrivers(activeDrivers.length ? activeDrivers : driverList);
        setVehicles(activeVehicles.length ? activeVehicles : vehicleList);
        setCustomers(c.customers || []);
        setMaterials(m.materials || []);
        setQuarries(q.quarries || []);
      })
      .catch(err => {
        if (alive) {
          setOptionsError(err.message || 'Could not load form options.');
        }
      });

    return () => {
      alive = false;
    };
  }, [visible]);

  const selectedVehicle = vehicles.find(item => item._id === vehicleId);
  const type = selectedVehicle?.type || '';
  const isJcb = type === 'JCB';

  const validate = () => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date.trim())) {
      return 'Enter the work date as DD/MM/YYYY.';
    }
    if (!driverId) {
      return drivers.length === 0 ? 'No drivers registered yet.' : 'Choose the driver.';
    }
    if (!selectedVehicle) {
      return vehicles.length === 0 ? 'No active vehicle available.' : 'Choose a vehicle.';
    }
    if (customers.length > 0 && !customerId) {
      return 'Choose the customer for this work.';
    }
    if (!quantity.trim()) {
      if (isJcb) return 'Enter the JCB operating hours (e.g. 6.5).';
      return type === 'TATA_ACE' ? 'Enter the number of trips.' : 'Enter the number of loads.';
    }
    if (isJcb && !/^\d+(\.\d+)?$/.test(quantity.trim())) {
      return 'Working hours must be a number (e.g. 6.5).';
    }
    if (!isJcb && !/^\d+$/.test(quantity.trim())) {
      return 'Number must be a whole number.';
    }
    if (type === 'TIPPER' && !materialId) {
      return materials.length === 0
        ? 'No materials registered.'
        : 'Choose the material for this load.';
    }
    if (mobile.trim() && !/^\d{10}$/.test(mobile.trim())) {
      return 'Enter a valid 10-digit mobile number (or leave it blank).';
    }
    if (!isAmount(dieselAmount)) return 'Diesel amount must be a number.';
    if (!isAmount(dieselLitres)) return 'Diesel litres must be a number.';
    if (!isAmount(otherExpenses)) return 'Other expenses must be a number.';
    if (otherExpenses.trim() !== '' && !expenseCategory) {
      return 'Choose a category for the other expenses.';
    }
    if (expenseCategory === 'Other' && !expenseDescription.trim()) {
      return 'Describe the other expense.';
    }
    return null;
  };

  const save = async () => {
    if (busy) return;
    const problem = validate();
    if (problem) {
      alert('Add work', problem, { type: 'warning' });
      return;
    }

    setBusy(true);
    try {
      await createWorkEntry({
        date: toIsoDate(date.trim()),
        type,
        vehicle: selectedVehicle._id,
        driver: driverId,
        customer: customerId || null,
        quarry: quarryId || null,
        material: materialId || null,
        jcbHours: isJcb ? Number(quantity) : 0,
        tipperLoads: type === 'TIPPER' ? Number(quantity) : 0,
        aceTrips: type === 'TATA_ACE' ? Number(quantity) : 0,
        dieselAmount: Number(dieselAmount) || 0,
        dieselLitres: Number(dieselLitres) || 0,
        otherExpense: Number(otherExpenses) || 0,
        mobile: mobile.trim(),
        expenseCategory,
        expenseDescription: expenseDescription.trim(),
        location: location.trim(),
        notes: notes.trim(),
      });
      alert(
        'Work entry created',
        'The entry was saved as submitted for verification.',
        { type: 'success' },
      );
      onSaved();
      onClose();
    } catch (err) {
      alert(
        'Add work',
        err instanceof Error ? err.message : 'Could not save the entry.',
        { type: 'error' },
      );
      setBusy(false);
    }
  };

  const handleScroll = e => {
    const y = e.nativeEvent.contentOffset.y + 130;
    let step = 0;
    if (y >= sectionY.current.b) step = 1;
    if (y >= sectionY.current.d) step = 2;
    setActiveStep(prev => (prev === step ? prev : step));
  };

  const jumpTo = i => {
    const target = [sectionY.current.a, sectionY.current.b, sectionY.current.d][i];
    if (scrollRef.current && scrollRef.current.scrollTo) {
      scrollRef.current.scrollTo({ y: Math.max(target - 8, 0), animated: true });
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.formShell}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.formKav}
          >
            <View style={styles.formHeader}>
              <TouchableOpacity
                style={styles.formBack}
                onPress={onClose}
                hitSlop={10}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="arrow-back" size={20} color="#182535" />
              </TouchableOpacity>
              <View style={styles.formHeaderText}>
                <Text style={styles.formTitle}>Add Work Entry</Text>
                <Text style={styles.formSubtitle}>
                  Log work for a driver — billing is calculated from the rate card on save.
                </Text>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={32}
              contentContainerStyle={styles.formScroll}
            >
              <StepIndicator
                steps={['Details', 'Work', 'Expenses']}
                active={activeStep}
                onStepPress={jumpTo}
              />

              {optionsError ? <Text style={styles.optionsError}>{optionsError}</Text> : null}

              <SectionCard
                num="01"
                title="Basic details"
                onLayout={e => {
                  sectionY.current.a = e.nativeEvent.layout.y;
                }}
              >
                <DatePickerField label="Date" value={date} onChange={setDate} />
                <Dropdown
                  label="Vehicle"
                  placeholder="Choose a vehicle"
                  emptyNote="No active vehicles."
                  value={vehicleId}
                  options={vehicles.map(vehicle => ({
                    value: vehicle._id,
                    label: `${typeLabel(vehicle.type)} · ${vehicle.registrationNo}`,
                  }))}
                  onChange={value => {
                    setVehicleId(value);
                    setQuantity('');
                  }}
                  open={openSelect === 'vehicle'}
                  onToggle={() => setOpenSelect(openSelect === 'vehicle' ? '' : 'vehicle')}
                  icon="car-sport"
                />
                <Dropdown
                  label="Driver"
                  placeholder="Choose a driver"
                  emptyNote="No drivers registered."
                  value={driverId}
                  options={drivers.map(driver => ({ value: driver._id, label: driver.name }))}
                  onChange={setDriverId}
                  open={openSelect === 'driver'}
                  onToggle={() => setOpenSelect(openSelect === 'driver' ? '' : 'driver')}
                  icon="person"
                />
              </SectionCard>

              <SectionCard
                num="02"
                title="Customer & location"
                onLayout={e => {
                  sectionY.current.b = e.nativeEvent.layout.y;
                }}
              >
                <LabeledInput
                  label="Mobile number (optional)"
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  icon="call"
                />
                <SearchableSelect
                  label="Customer"
                  placeholder="Search customers"
                  emptyNote="No customers registered."
                  value={customerId}
                  options={customers.map(customer => ({ value: customer._id, label: customer.name }))}
                  onChange={setCustomerId}
                  open={openSelect === 'customer'}
                  onToggle={() => setOpenSelect(openSelect === 'customer' ? '' : 'customer')}
                />
                <LabeledInput
                  label="Work location (optional)"
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Work location"
                  icon="location"
                />
              </SectionCard>

              <SectionCard
                num="03"
                title={isJcb ? 'JCB work details' : 'Work details'}
                onLayout={e => {
                  sectionY.current.c = e.nativeEvent.layout.y;
                }}
              >
                <LabeledInput
                  label={
                    isJcb
                      ? 'Working hours (e.g. 6.5)'
                      : type === 'TATA_ACE'
                        ? 'Number of trips'
                        : 'Number of loads'
                  }
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType={isJcb ? 'decimal-pad' : 'number-pad'}
                  placeholder={type ? undefined : 'Choose a vehicle first'}
                  icon={isJcb ? 'stopwatch' : 'layers'}
                />
                {type === 'TIPPER' ? (
                  <Dropdown
                    label="Material"
                    placeholder="Choose a material"
                    emptyNote="No materials registered."
                    value={materialId}
                    options={materials.map(material => ({
                      value: material._id,
                      label: material.name,
                    }))}
                    onChange={setMaterialId}
                    open={openSelect === 'material'}
                    onToggle={() => setOpenSelect(openSelect === 'material' ? '' : 'material')}
                    icon="cube"
                  />
                ) : null}
                <Dropdown
                  label="Source quarry (optional)"
                  placeholder="None"
                  emptyNote="No quarries registered."
                  value={quarryId}
                  options={[
                    { value: '', label: 'None' },
                    ...quarries.map(quarry => ({ value: quarry._id, label: quarry.name })),
                  ]}
                  onChange={setQuarryId}
                  open={openSelect === 'quarry'}
                  onToggle={() => setOpenSelect(openSelect === 'quarry' ? '' : 'quarry')}
                  icon="location"
                />
              </SectionCard>

              <SectionCard
                num="04"
                title="Expenses & notes"
                onLayout={e => {
                  sectionY.current.d = e.nativeEvent.layout.y;
                }}
              >
                <LabeledInput
                  label="Diesel amount"
                  prefix="₹"
                  value={dieselAmount}
                  onChangeText={setDieselAmount}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
                <LabeledInput
                  label="Diesel litres"
                  value={dieselLitres}
                  onChangeText={setDieselLitres}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  icon="water"
                />
                <LabeledInput
                  label="Other expenses"
                  prefix="₹"
                  value={otherExpenses}
                  onChangeText={setOtherExpenses}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
                {otherExpenses.trim() !== '' ? (
                  <Dropdown
                    label="Expense category"
                    placeholder="Choose a category"
                    emptyNote="No categories."
                    value={expenseCategory}
                    options={EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                    onChange={setExpenseCategory}
                    open={openSelect === 'expense'}
                    onToggle={() => setOpenSelect(openSelect === 'expense' ? '' : 'expense')}
                    icon="pricetag"
                  />
                ) : null}
                <LabeledInput
                  label="Expense description"
                  value={expenseDescription}
                  onChangeText={setExpenseDescription}
                  placeholder="Short note about this expense"
                  icon="create"
                />
                <LabeledInput
                  label="Additional notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything else about this work"
                  multiline
                  icon="document-text"
                />
              </SectionCard>

              <SubmitButton
                title={busy ? 'Saving…' : 'Create work entry'}
                onPress={save}
                disabled={busy}
              />
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {alertNode}
    </>
  );
}

function StatusPill({ status }) {
  const tone =
    status === 'LOCKED' ? 'blue' : status === 'VERIFIED' ? 'green' : 'orange';
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Draft';
  return <Badge label={label} tone={tone} />;
}

const styles = StyleSheet.create({
  content: { paddingBottom: S.xxl },
  contentSelecting: { paddingBottom: 104 },
  header: {
    backgroundColor: '#FFFDFA',
    marginHorizontal: -(S.lg + 50),
    marginTop: S.xxl + 10,
    marginBottom: 18,
    paddingHorizontal: S.lg + 60,
    paddingTop: 28,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 23, fontWeight: '800', color: '#182F50' },
  headerSubtitle: { fontSize: 12, color: '#85858A', marginTop: 5 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5B923',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 5,
  },
  addButtonText: { fontSize: 13, fontWeight: '800', color: '#182F50' },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
    marginBottom: S.md,
  },
  row: { paddingVertical: S.md, marginBottom: S.sm },
  rowSelected: { borderColor: C.primary, backgroundColor: C.softOrange },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E9E0D2',
    marginRight: S.sm,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOn: { backgroundColor: C.primary, borderColor: C.primary },
  selectionBar: {
    position: 'absolute',
    left: S.lg,
    right: S.lg,
    bottom: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.sm,
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 20,
  },
  selectionCancelText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  selectionCount: { fontSize: 13, fontWeight: '800', color: C.textPrimary },
  selectionAllText: { fontSize: 13, fontWeight: '700', color: C.primary },
  selectionDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C43D35',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  selectionDeleteOff: { opacity: 0.45 },
  selectionDeleteText: { fontSize: 13, fontWeight: '800', color: '#FFFDFA' },
  rowBody: { flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  rowSub: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  rowDriverLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  rowDriver: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    flexShrink: 1,
  },
  rowDriverNone: { fontSize: 12, fontWeight: '400', color: C.textMuted },
  hint: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: S.md,
  },
  errorCard: { borderColor: C.danger, marginBottom: S.sm },
  errorText: { fontSize: 13, color: C.danger, fontWeight: '600' },

  modalShell: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 37, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetLayer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  grabber: {
    paddingTop: S.md,
    paddingBottom: S.sm,
    paddingHorizontal: S.xl,
  },
  grabberBar: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E9E0D2',
    marginBottom: S.sm,
  },
  sheetBody: {
    paddingTop: S.sm,
    paddingHorizontal: S.xl,
    paddingBottom: S.xxl,
  },
  modalTitle: { ...T.title, color: C.primary },
  sectionNote: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
    marginBottom: S.md,
    lineHeight: 17,
  },
  optionsError: {
    fontSize: 13,
    color: C.danger,
    fontWeight: '600',
    marginBottom: S.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: S.sm,
  },
  dropdownWrap: { marginBottom: S.md },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    minHeight: 46,
  },
  dropdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    flex: 1,
    marginRight: S.sm,
  },
  dropdownPlaceholder: { color: C.textMuted, fontWeight: '400' },
  dropdownList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 190 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.md,
    paddingVertical: 11,
    gap: S.sm,
  },
  dropdownItemActive: { backgroundColor: C.softOrange },
  dropdownItemText: { fontSize: 13, color: C.textPrimary, flex: 1 },
  dropdownItemTextActive: { fontWeight: '700', color: C.primary },
  dropdownEmpty: {
    marginTop: 6,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    backgroundColor: C.surface,
  },
  emptyNote: { fontSize: 13, color: C.textSecondary },
  cancelBtn: { alignItems: 'center', paddingVertical: S.md },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },

  formShell: { flex: 1, backgroundColor: '#F7F2E8' },
  formKav: { flex: 1 },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E0D2',
  },
  formBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  formHeaderText: { flex: 1 },
  formTitle: { fontSize: 19, fontWeight: '800', color: '#182535' },
  formSubtitle: { fontSize: 12, color: '#85858A', marginTop: 4, lineHeight: 16 },
  formScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
});
