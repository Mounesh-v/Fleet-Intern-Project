import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Screen, Card } from '../../components/UI';
import {
  Dropdown,
  DatePickerField,
  LabeledInput,
  SectionCard,
  StepIndicator,
  SubmitButton,
} from '../../components/FormControls';
import { useCustomAlert } from '../../components/CustomAlert';
import { S } from '../../themeCompat';
import { typeLabel } from '../../services/adminService';

const NAVY = '#172F50';
const TEXT = '#182B45';
const MUTED = '#8B9AAF';
const BORDER = '#E6EBF1';
const WHITE = '#FFFFFF';
const BG = '#F3F5F8';
const YELLOW = '#F5B923';
const TINT = '#FFF6DE';

const EXPENSE_CATEGORIES = ['Fuel', 'Food', 'Maintenance', 'Toll', 'Other'];
const CATEGORY_ICONS = {
  Fuel: 'flame',
  Food: 'restaurant',
  Maintenance: 'construct',
  Toll: 'cash',
  Other: 'ellipsis-horizontal',
};

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
 * WorkEntryScreen — record today's work against the real fleet data.
 * Vehicles / materials / quarries come from the backend; saving posts
 * to the server (billing + driver scope enforced there).
 */
export default function WorkEntryScreen({
  session,
  options,
  onSave,
  scrollSection,
  scrollTrigger,
}) {
  const vehicles = options?.vehicles || [];
  const materials = options?.materials || [];
  const quarries = options?.quarries || [];

  const assignedReg = session?.vehicle ? session.vehicle.split(' · ')[0] : '';
  const initialVehicle = vehicles.some(v => v.registrationNo === assignedReg)
    ? assignedReg
    : vehicles[0]?.registrationNo || '';

  const [date, setDate] = useState(today());
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [customer, setCustomer] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [hours, setHours] = useState('');
  const [loads, setLoads] = useState('');
  const [materialId, setMaterialId] = useState(materials[0]?._id || '');
  const [quarryId, setQuarryId] = useState('');
  const [dieselAmount, setDieselAmount] = useState('');
  const [dieselLitres, setDieselLitres] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [openSelect, setOpenSelect] = useState('');
  const { alert, alertNode } = useCustomAlert();
  const scrollRef = useRef<any>(null);
  const sectionY = useRef({ a: 0, b: 0, c: 0, d: 0 });
  const [activeStep, setActiveStep] = useState(0);

  // "Add Expense" from the dashboard opens this form at the expenses block.
  useEffect(() => {
    if (!scrollTrigger || scrollSection !== 'expenses') {
      return undefined;
    }
    const timer = setTimeout(() => {
      setActiveStep(2);
      const target = sectionY.current.d;
      if (scrollRef.current && scrollRef.current.scrollTo && target > 0) {
        scrollRef.current.scrollTo({ y: Math.max(target - 8, 0), animated: false });
      } else if (scrollRef.current && scrollRef.current.scrollToEnd) {
        scrollRef.current.scrollToEnd({ animated: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollTrigger, scrollSection]);

  const selectedVehicle = vehicles.find(v => v.registrationNo === vehicle);
  const type = selectedVehicle?.type || '';
  const isJcb = type === 'JCB';

  const validate = () => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date.trim())) {
      return 'Enter the work date as DD/MM/YYYY.';
    }
    if (!selectedVehicle) {
      return vehicles.length === 0
        ? 'No active vehicle available — contact the admin.'
        : 'Choose a vehicle.';
    }
    if (!customer.trim()) {
      return 'Enter the customer name.';
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      return 'Enter a valid 10-digit mobile number.';
    }
    if (!location.trim()) {
      return 'Enter the work location.';
    }
    if (isJcb && !hours.trim()) {
      return 'Enter the JCB operating hours (e.g. 6.5).';
    }
    if (isJcb && !/^\d+(\.\d+)?$/.test(hours.trim())) {
      return 'Working hours must be a number (e.g. 6.5).';
    }
    if (!isJcb && !loads.trim()) {
      return type === 'TATA_ACE' ? 'Enter the number of trips.' : 'Enter the number of loads.';
    }
    if (!isJcb && !/^\d+$/.test(loads.trim())) {
      return 'Number must be a whole number.';
    }
    if (type === 'TIPPER' && !materialId) {
      return materials.length === 0
        ? 'No materials registered — contact the admin.'
        : 'Choose the material for this load.';
    }
    if (!isAmount(dieselAmount)) {
      return 'Diesel amount must be a number.';
    }
    if (!isAmount(dieselLitres)) {
      return 'Diesel litres must be a number.';
    }
    if (!isAmount(otherExpenses)) {
      return 'Other expenses must be a number.';
    }
    if (otherExpenses.trim() !== '' && !expenseCategory) {
      return 'Choose a category for the other expenses.';
    }
    if (expenseCategory === 'Other' && !expenseDescription.trim()) {
      return 'Describe the other expense.';
    }
    return null;
  };

  const resetForm = () => {
    setDate(today());
    setCustomer('');
    setMobile('');
    setLocation('');
    setHours('');
    setLoads('');
    setQuarryId('');
    setDieselAmount('');
    setDieselLitres('');
    setOtherExpenses('');
    setExpenseCategory('');
    setExpenseDescription('');
    setNotes('');
  };

  const save = async () => {
    if (busy) return;
    const problem = validate();
    if (problem) {
      alert('Work entry', problem, { type: 'warning' });
      return;
    }

    setBusy(true);
    try {
      await onSave({
        date: toIsoDate(date.trim()),
        vehicle: selectedVehicle._id,
        customerName: customer.trim(),
        mobile: mobile.trim(),
        location: location.trim(),
        material: materialId || null,
        quarry: quarryId || null,
        jcbHours: isJcb ? Number(hours) : 0,
        tipperLoads: type === 'TIPPER' ? Number(loads) : 0,
        aceTrips: type === 'TATA_ACE' ? Number(loads) : 0,
        dieselAmount: Number(dieselAmount) || 0,
        dieselLitres: Number(dieselLitres) || 0,
        otherExpense: Number(otherExpenses) || 0,
        expenseCategory,
        expenseDescription: expenseDescription.trim(),
        notes: notes.trim(),
      });
      alert(
        'Saved',
        'Work entry saved and sent for admin verification.',
        { type: 'success' },
      );
      resetForm();
    } catch (err) {
      alert(
        'Work entry',
        err instanceof Error ? err.message : 'Could not save the entry.',
        { type: 'error' },
      );
    } finally {
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
    <Screen style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Add Work Entry</Text>
          <Text style={styles.sub}>Record today's work and expenses.</Text>
        </View>

        <Card style={styles.driverCard}>
          <Text style={styles.driverLabel}>Driver</Text>
          <Text style={styles.driverName}>{session?.name || 'Driver'}</Text>
          <Text style={styles.driverMeta}>
            {session?.employeeId || session?.username || ''}
            {session?.vehicle ? `  ·  ${session.vehicle}` : ''}
          </Text>
        </Card>

        <StepIndicator
          steps={['Details', 'Work', 'Expenses']}
          active={activeStep}
          onStepPress={jumpTo}
          tone="driver"
        />

        <SectionCard
          num="01"
          title="Basic details"
          onLayout={e => {
            sectionY.current.a = e.nativeEvent.layout.y;
          }}
          tone="driver"
        >
          <DatePickerField label="Date" value={date} onChange={setDate} tone="driver" />
          <Dropdown
            label="Vehicle"
            placeholder="Choose a vehicle"
            emptyNote="No active vehicle available."
            value={vehicle}
            options={vehicles.map(v => ({
              value: v.registrationNo,
              label: `${typeLabel(v.type)} · ${v.registrationNo}`,
            }))}
            onChange={setVehicle}
            open={openSelect === 'vehicle'}
            onToggle={() => setOpenSelect(openSelect === 'vehicle' ? '' : 'vehicle')}
            icon="car-sport"
            tone="driver"
          />
        </SectionCard>

        <SectionCard
          num="02"
          title="Customer & location"
          onLayout={e => {
            sectionY.current.b = e.nativeEvent.layout.y;
          }}
          tone="driver"
        >
          <LabeledInput
            label="Mobile number"
            value={mobile}
            onChangeText={setMobile}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            icon="call"
            tone="driver"
          />
          <LabeledInput
            label="Customer name"
            value={customer}
            onChangeText={setCustomer}
            placeholder="Customer name"
            icon="person"
            tone="driver"
          />
          <LabeledInput
            label="Work location"
            value={location}
            onChangeText={setLocation}
            placeholder="Work location"
            icon="location"
            tone="driver"
          />
        </SectionCard>

        <SectionCard
          num="03"
          title={isJcb ? 'JCB work details' : 'Work details'}
          onLayout={e => {
            sectionY.current.c = e.nativeEvent.layout.y;
          }}
          tone="driver"
        >
          <LabeledInput
            label={
              isJcb
                ? 'Working hours (e.g. 6.5)'
                : type === 'TATA_ACE'
                  ? 'Number of trips'
                  : 'Number of loads'
            }
            value={isJcb ? hours : loads}
            onChangeText={isJcb ? setHours : setLoads}
            keyboardType={isJcb ? 'decimal-pad' : 'number-pad'}
            icon={isJcb ? 'stopwatch' : 'layers'}
            tone="driver"
          />
          {!isJcb ? (
            <Dropdown
              label="Material"
              placeholder="Choose a material"
              emptyNote="No materials registered."
              value={materialId}
              options={materials.map(m => ({ value: m._id, label: m.name }))}
              onChange={setMaterialId}
              open={openSelect === 'material'}
              onToggle={() => setOpenSelect(openSelect === 'material' ? '' : 'material')}
              icon="cube"
              tone="driver"
            />
          ) : null}
          <Dropdown
            label="Source quarry (optional)"
            placeholder="None"
            emptyNote="No quarries registered."
            value={quarryId}
            options={[
              { value: '', label: 'None' },
              ...quarries.map(q => ({ value: q._id, label: q.name })),
            ]}
            onChange={setQuarryId}
            open={openSelect === 'quarry'}
            onToggle={() => setOpenSelect(openSelect === 'quarry' ? '' : 'quarry')}
            icon="location"
            tone="driver"
          />
        </SectionCard>

        <SectionCard
          num="04"
          title="Expenses & notes"
          onLayout={e => {
            sectionY.current.d = e.nativeEvent.layout.y;
          }}
          tone="driver"
        >
          <LabeledInput
            label="Diesel amount"
            prefix="₹"
            value={dieselAmount}
            onChangeText={setDieselAmount}
            placeholder="0"
            keyboardType="decimal-pad"
            tone="driver"
          />
          <LabeledInput
            label="Diesel litres"
            value={dieselLitres}
            onChangeText={setDieselLitres}
            placeholder="0"
            keyboardType="decimal-pad"
            icon="water"
            tone="driver"
          />
          <LabeledInput
            label="Other expenses"
            prefix="₹"
            value={otherExpenses}
            onChangeText={setOtherExpenses}
            placeholder="0"
            keyboardType="decimal-pad"
            tone="driver"
          />
          <View>
            <Text style={styles.gridLabel}>Expense category</Text>
            <View style={styles.catGrid}>
              {EXPENSE_CATEGORIES.map((cat, i) => {
                const active = expenseCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catCard,
                      (i + 1) % 3 === 0 && styles.catCardNoGap,
                      active && styles.catCardOn,
                    ]}
                    onPress={() => setExpenseCategory(cat)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.catIcon, active && styles.catIconOn]}>
                      <Ionicons
                        name={CATEGORY_ICONS[cat] || 'pricetag'}
                        size={17}
                        color={NAVY}
                      />
                    </View>
                    <Text style={[styles.catText, active && styles.catTextOn]} numberOfLines={1}>
                      {cat}
                    </Text>
                    {active ? (
                      <View style={styles.catCheck}>
                        <Ionicons name="checkmark" size={11} color={NAVY} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <LabeledInput
            label="Expense description"
            value={expenseDescription}
            onChangeText={setExpenseDescription}
            placeholder="Short note about this expense"
            icon="create"
            tone="driver"
          />
          <LabeledInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else about this work"
            multiline
            icon="document-text"
            tone="driver"
          />
        </SectionCard>

        <SubmitButton
          title={busy ? 'Saving…' : 'Save work entry'}
          onPress={save}
          disabled={busy}
          tone="driver"
        />
        <Text style={styles.foot}>
          Saved entries appear in your history and go to the admin for verification.
        </Text>
        {alertNode}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: BG },
  scroll: { paddingTop: 18, paddingBottom: S.xl },
  header: { marginBottom: 14 },
  heading: { fontSize: 20, fontWeight: '800', color: NAVY },
  sub: { fontSize: 12.5, color: MUTED, marginTop: 4, lineHeight: 17 },
  driverCard: { backgroundColor: WHITE, borderColor: BORDER, marginBottom: 12 },
  driverLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MUTED,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  driverName: { fontSize: 16, fontWeight: '800', color: NAVY },
  driverMeta: { fontSize: 12, color: MUTED, marginTop: 4 },
  gridLabel: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 7 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  catCard: {
    width: '31%',
    marginRight: '3.5%',
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 7,
  },
  catCardNoGap: { marginRight: 0 },
  catCardOn: { borderWidth: 2, borderColor: YELLOW, backgroundColor: TINT },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconOn: { backgroundColor: YELLOW },
  catText: { fontSize: 11.5, fontWeight: '700', color: TEXT, textAlign: 'center' },
  catTextOn: { color: NAVY, fontWeight: '800' },
  catCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foot: { textAlign: 'center', color: MUTED, fontSize: 11, marginTop: S.lg },
});
