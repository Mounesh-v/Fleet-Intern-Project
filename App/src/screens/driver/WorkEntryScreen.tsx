import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Screen, Card, Field, PrimaryButton, SectionTitle, Chip } from '../../components/UI';
import { C, S, T } from '../../themeCompat';
import { vehicles } from '../../data/mockData';

const EXPENSE_CATEGORIES = ['Fuel', 'Food', 'Maintenance', 'Toll', 'Other'];

const pad = value => String(value).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const isAmount = value => value.trim() === '' || /^\d+(\.\d+)?$/.test(value.trim());

export default function WorkEntryScreen({ t, session, onSave }) {
  const [date, setDate] = useState(today());
  const [vehicle, setVehicle] = useState(
    () => session?.vehicle?.split(' · ')[0] || '5783',
  );
  const [customer, setCustomer] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [hours, setHours] = useState('');
  const [loads, setLoads] = useState('');
  const [material, setMaterial] = useState('M-sand');
  const [quarry, setQuarry] = useState('');
  const [dieselAmount, setDieselAmount] = useState('');
  const [dieselLitres, setDieselLitres] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [notes, setNotes] = useState('');

  const selectedVehicle = vehicles.find(v => v.registration === vehicle);
  const isJcb = selectedVehicle?.type === 'JCB';

  const validate = () => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date.trim())) {
      return 'Enter the work date as DD/MM/YYYY.';
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
      return 'Enter the number of loads.';
    }
    if (!isJcb && !/^\d+$/.test(loads.trim())) {
      return 'Number of loads must be a whole number.';
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

  const save = () => {
    const problem = validate();
    if (problem) {
      Alert.alert(t('workEntry'), problem);
      return;
    }

    const entry = {
      date: date.trim(),
      vehicle,
      customer: customer.trim(),
      mobile: mobile.trim(),
      location: location.trim(),
      hours: hours.trim(),
      loads: loads.trim(),
      material: isJcb ? '' : material,
      quarry: isJcb ? '' : quarry.trim(),
      dieselAmount: dieselAmount.trim(),
      dieselLitres: dieselLitres.trim(),
      otherExpenses: otherExpenses.trim(),
      expenseCategory,
      expenseDescription: expenseDescription.trim(),
      notes: notes.trim(),
      driverId: session?.driverId,
      driverName: session?.name,
      username: session?.username,
      savedAt: new Date().toISOString(),
    };

    onSave?.(entry);
    Alert.alert('Saved', 'Work entry saved to your records.');

    setDate(today());
    setCustomer('');
    setMobile('');
    setLocation('');
    setHours('');
    setLoads('');
    setQuarry('');
    setDieselAmount('');
    setDieselLitres('');
    setOtherExpenses('');
    setExpenseCategory('');
    setExpenseDescription('');
    setNotes('');
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>{t('workEntry')}</Text>
        <Text style={styles.sub}>Record today's work and expenses.</Text>

        <Card style={styles.driverCard}>
          <Text style={styles.driverLabel}>{t('driver')}</Text>
          <Text style={styles.driverName}>{session?.name || 'Driver'}</Text>
          <Text style={styles.driverMeta}>
            {session?.employeeId || session?.username || ''}
            {session?.vehicle ? `  ·  ${session.vehicle}` : ''}
          </Text>
        </Card>

        <SectionTitle title="Work details" />
        <Field label={t('date')} value={date} onChangeText={setDate} placeholder="DD/MM/YYYY" />

        <Text style={styles.label}>{t('vehicle')}</Text>
        <View style={styles.chipRow}>
          {vehicles.filter(v => v.status === 'Active').map(v => (
            <Chip
              key={v.id}
              label={`${v.type} · ${v.registration}`}
              selected={vehicle === v.registration}
              onPress={() => setVehicle(v.registration)}
            />
          ))}
        </View>

        <Field label={t('customerName')} value={customer} onChangeText={setCustomer} />
        <Field label={t('mobile')} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <Field label={t('location')} value={location} onChangeText={setLocation} />

        {isJcb ? (
          <Field label={`${t('hours')} (e.g. 6.5)`} value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
        ) : (
          <>
            <Field label={t('loads')} value={loads} onChangeText={setLoads} keyboardType="number-pad" />
            <Text style={styles.label}>{t('material')}</Text>
            <View style={styles.chipRow}>
              {['M-sand', 'P-sand', 'Soil', 'Aggregate', 'Other'].map(m => (
                <Chip key={m} label={m} selected={material === m} onPress={() => setMaterial(m)} />
              ))}
            </View>
            <Field label={t('quarry')} value={quarry} onChangeText={setQuarry} />
          </>
        )}

        <SectionTitle title={t('expensesLabel')} />
        <Field label={t('dieselAmount')} value={dieselAmount} onChangeText={setDieselAmount} keyboardType="decimal-pad" />
        <Field label={t('dieselLitres')} value={dieselLitres} onChangeText={setDieselLitres} keyboardType="decimal-pad" />
        <Field label={t('otherExpenses')} value={otherExpenses} onChangeText={setOtherExpenses} keyboardType="decimal-pad" />

        <Text style={styles.label}>{t('expenseCategory')}</Text>
        <View style={styles.chipRow}>
          {EXPENSE_CATEGORIES.map(cat => (
            <Chip
              key={cat}
              label={cat}
              selected={expenseCategory === cat}
              onPress={() => setExpenseCategory(cat)}
            />
          ))}
        </View>

        <Field
          label={t('expenseDescription')}
          value={expenseDescription}
          onChangeText={setExpenseDescription}
          placeholder="Short note about this expense"
        />

        <SectionTitle title={t('notes')} />
        <Field label={t('notes')} value={notes} onChangeText={setNotes} multiline />

        <PrimaryButton title={t('saveEntry')} onPress={save} />
        <Text style={styles.foot}>{t('demoNotice')}</Text>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  scroll: { paddingBottom: S.xl },
  heading: { ...T.heading, color: C.textPrimary },
  sub: { ...T.body, color: C.textSecondary, marginTop: 3, marginBottom: S.md },
  driverCard: { backgroundColor: C.softGreen, borderColor: C.border, marginBottom: S.sm },
  driverLabel: { ...T.label, color: C.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  driverName: { ...T.title, color: C.primary, fontSize: 16 },
  driverMeta: { ...T.caption, color: C.textSecondary, marginTop: 4 },
  label: { ...T.label, color: C.textPrimary, marginBottom: S.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: S.md },
  foot: { textAlign: 'center', color: C.textMuted, fontSize: 10, marginTop: S.lg },
});
