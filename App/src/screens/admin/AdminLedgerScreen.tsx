// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, EmptyState, Loading, Field, PrimaryButton } from '../../components/UI';
import SheetModal from '../../components/SheetModal';
import {
  fetchCustomers,
  fetchWorkEntries,
  fetchPayments,
  createCustomer,
  formatMoney,
  formatDay,
  entryQuantity,
} from '../../services/adminService';

const NAVY = '#182F50';
const YELLOW = '#F5B923';
const BG = '#F6F1E7';
const WHITE = '#FFFDFA';
const TEXT = '#292D32';
const MUTED = '#85858A';
const GREEN = '#16845B';
const RED = '#C43D35';
const BORDER = '#E9E0D2';

const FILTERS = [
  { key: 'all', label: 'All transactions' },
  { key: 'bills', label: 'Bills only' },
  { key: 'payments', label: 'Payments only' },
];

const dayOf = value => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return String(d.getDate()).padStart(2, '0');
};

const monthYearOf = value => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${month}/${String(d.getFullYear()).slice(2)}`;
};

/**
 * AdminLedgerScreen — per-customer ledger from the design spec: navy
 * outstanding card with record-payment / statement actions, compact
 * billed/paid/advance cards, customer picker and a filtered timeline
 * of bills and payments with running balances. All data comes from
 * GET /admin/customers, /admin/work-entries and /admin/payments
 * (no server-side customer filter, so aggregation is client-side).
 */
export default function AdminLedgerScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [customers, setCustomers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    openingBalance: '',
  });
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, w, p] = await Promise.all([
        fetchCustomers(),
        fetchWorkEntries(),
        fetchPayments(),
      ]);
      setCustomers(c.customers || []);
      setEntries(w.entries || []);
      setPayments(p.payments || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Per-customer aggregates: billed from work entries, paid from payments.
  const rows = useMemo(() => {
    const billedBy = {};
    entries.forEach(entry => {
      const id = entry.customer?._id || entry.customer;
      if (!id) return;
      billedBy[String(id)] =
        (billedBy[String(id)] || 0) + (entry.billedAmount || 0);
    });
    const paidBy = {};
    payments.forEach(payment => {
      const id = payment.customer?._id || payment.customer;
      if (!id) return;
      paidBy[String(id)] = (paidBy[String(id)] || 0) + (payment.amount || 0);
    });

    return customers.map(customer => {
      const billed = billedBy[String(customer._id)] || 0;
      const paid = paidBy[String(customer._id)] || 0;
      const opening = Number(customer.openingBalance) || 0;
      const balance = opening + billed - paid;
      return {
        customer,
        billed,
        paid,
        opening,
        balance,
        outstanding: Math.max(0, balance),
        advance: Math.max(0, -balance),
      };
    });
  }, [customers, entries, payments]);

  // Selected customer, defaulting to the largest outstanding balance.
  const selected = useMemo(() => {
    const match = rows.find(
      row => String(row.customer._id) === String(selectedId),
    );
    if (match) return match;
    const sorted = [...rows].sort((a, b) => b.balance - a.balance);
    return sorted[0] || null;
  }, [rows, selectedId]);

  // Merged bill/payment timeline with a running balance, newest first.
  const timeline = useMemo(() => {
    if (!selected) return [];
    const cid = String(selected.customer._id);
    const txns = [];
    const opening = Number(selected.customer.openingBalance) || 0;

    if (opening !== 0) {
      txns.push({
        key: 'opening',
        kind: 'opening',
        date: selected.customer.createdAt,
        amount: opening,
        title: 'Opening balance',
        ref: '',
        desc: 'Carried forward',
      });
    }

    entries.forEach(entry => {
      const id = entry.customer?._id || entry.customer;
      if (!id || String(id) !== cid) return;
      txns.push({
        key: `b-${entry._id}`,
        kind: 'bill',
        date: entry.date,
        amount: entry.billedAmount || 0,
        title: 'Bill generated',
        ref: entry.billNumber || '',
        desc: [
          entry.vehicle?.registrationNo,
          entryQuantity(entry),
          entry.driver?.name,
        ]
          .filter(Boolean)
          .join(' · '),
      });
    });

    payments.forEach(payment => {
      const id = payment.customer?._id || payment.customer;
      if (!id || String(id) !== cid) return;
      txns.push({
        key: `p-${payment._id}`,
        kind: 'payment',
        date: payment.date,
        amount: payment.amount || 0,
        title: 'Payment received',
        ref: payment.reference || '',
        desc: [payment.mode, payment.notes].filter(Boolean).join(' · '),
      });
    });

    txns.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return String(a.key).localeCompare(String(b.key));
    });

    let running = opening;
    txns.forEach(txn => {
      if (txn.kind === 'bill') running += txn.amount;
      if (txn.kind === 'payment') running -= txn.amount;
      txn.balance = running;
    });

    return txns.reverse();
  }, [selected, entries, payments]);

  const visibleTxns = useMemo(() => {
    if (typeFilter === 'all') return timeline;
    const kind = typeFilter === 'bills' ? 'bill' : 'payment';
    return timeline.filter(txn => txn.kind === kind);
  }, [timeline, typeFilter]);

  const lastPayment = useMemo(() => {
    if (!selected) return null;
    const cid = String(selected.customer._id);
    return (
      payments.find(
        payment =>
          String(payment.customer?._id || payment.customer) === cid,
      ) || null
    );
  }, [selected, payments]);

  const recordPayment = () => {
    navigation.popTo('AdminTabs', {
      screen: 'Finance',
      params: { open: 'payment' },
    });
  };

  const openStatement = () => {
    if (!selected) return;
    navigation.navigate('Statement', {
      customerId: String(selected.customer._id),
    });
  };

  const openAdd = () => {
    setForm({ name: '', phone: '', address: '', openingBalance: '' });
    setFormError('');
    setFormBusy(false);
    setAddOpen(true);
  };

  const setFormField = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const createLedger = async () => {
    if (formBusy) return;
    const name = form.name.trim();
    if (!name) {
      setFormError('Customer name is required.');
      return;
    }
    const rawOpening = form.openingBalance.trim();
    const opening = rawOpening === '' ? 0 : Number(rawOpening);
    if (!Number.isFinite(opening)) {
      setFormError('Opening balance must be a number.');
      return;
    }
    setFormBusy(true);
    setFormError('');
    try {
      const data = await createCustomer({
        name,
        phone: form.phone.trim(),
        address: form.address.trim(),
        openingBalance: opening,
      });
      const created = data && data.customer ? data.customer : null;
      setAddOpen(false);
      if (created && created._id) {
        setSelectedId(String(created._id));
      }
      load();
    } catch (err) {
      setFormError(err.message || 'Could not create the customer.');
      setFormBusy(false);
    }
  };

  const balanceLabel = balance => {
    if (balance > 0) return `Balance ${formatMoney(balance)}`;
    if (balance < 0) return `Advance ${formatMoney(-balance)}`;
    return 'Settled';
  };

  if (loading) {
    return <Loading label="Loading ledger…" />;
  }

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
            tintColor={NAVY}
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={20} color={NAVY} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Customer Ledger</Text>
            <TouchableOpacity
              style={styles.customerPick}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.7}
              hitSlop={6}
            >
              <Text style={styles.subtitle} numberOfLines={1}>
                {selected ? selected.customer.name : 'Select customer'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={MUTED} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={openAdd}
            style={styles.addBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Create customer"
          >
            <Ionicons name="add" size={22} color={NAVY} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              title="No customers yet"
              subtitle="Add customers to start tracking bills and payments."
            />
            <PrimaryButton
              title="Create customer"
              onPress={openAdd}
              style={styles.emptyCreate}
            />
          </View>
        ) : !selected ? (
          <View style={styles.emptyCard}>
            <EmptyState
              title="Select a customer"
              subtitle="Pick a customer to see their ledger."
            />
          </View>
        ) : (
          <>
            <View style={styles.outstandingCard}>
              <Text style={styles.outstandingLabel}>CURRENT OUTSTANDING</Text>
              <Text style={styles.outstandingAmount}>
                {formatMoney(selected.outstanding)}
              </Text>
              <Text style={styles.outstandingSub}>
                {lastPayment
                  ? `Last payment ${formatDay(lastPayment.date)}`
                  : 'No payments recorded yet'}
              </Text>
              <View style={styles.outstandingActions}>
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={recordPayment}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={17} color={NAVY} />
                  <Text style={styles.payBtnText}>Record payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statementBtn}
                  onPress={openStatement}
                  activeOpacity={0.85}
                >
                  <Ionicons name="receipt-outline" size={16} color={WHITE} />
                  <Text style={styles.statementBtnText}>Statement</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total billed</Text>
                <Text style={[styles.summaryValue, styles.valueNavy]}>
                  {formatMoney(selected.billed)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total paid</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: selected.paid > 0 ? GREEN : MUTED },
                  ]}
                >
                  {formatMoney(selected.paid)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Advance</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: selected.advance > 0 ? GREEN : MUTED },
                  ]}
                >
                  {formatMoney(selected.advance)}
                </Text>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Transaction history</Text>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  typeFilter !== 'all' && styles.filterBtnActive,
                ]}
                onPress={() => setFilterOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Filter transactions"
              >
                <Ionicons name="funnel-outline" size={16} color={NAVY} />
              </TouchableOpacity>
            </View>

            <View style={styles.historyCard}>
              {visibleTxns.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <EmptyState
                    title="No transactions yet"
                    subtitle="Bills and payments appear here as they are recorded."
                  />
                </View>
              ) : (
                visibleTxns.map(txn => (
                  <View key={txn.key} style={styles.txnRow}>
                    <View style={styles.txnDate}>
                      <Text style={styles.txnDay}>{dayOf(txn.date)}</Text>
                      <Text style={styles.txnMonth}>{monthYearOf(txn.date)}</Text>
                    </View>

                    <View style={styles.markerCol}>
                      <View style={styles.markerLine} />
                      <View style={styles.markerDot} />
                    </View>

                    <View style={styles.txnBody}>
                      <Text style={styles.txnTitle}>{txn.title}</Text>
                      {txn.ref ? (
                        <Text style={styles.txnRef}>Ref {txn.ref}</Text>
                      ) : null}
                      {txn.desc ? (
                        <Text style={styles.txnDesc}>{txn.desc}</Text>
                      ) : null}
                      <Text style={styles.txnBalance}>
                        {balanceLabel(txn.balance)}
                      </Text>
                    </View>

                    <View style={styles.txnAmountCol}>
                      <Text
                        style={[
                          styles.txnAmount,
                          txn.kind === 'bill' ||
                          (txn.kind === 'opening' && txn.amount >= 0)
                            ? styles.amountBill
                            : styles.amountPay,
                        ]}
                        numberOfLines={1}
                      >
                        {txn.kind === 'bill' ||
                        (txn.kind === 'opening' && txn.amount >= 0)
                          ? '+'
                          : '−'}
                        {formatMoney(Math.abs(txn.amount))}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <SheetModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select customer"
      >
        {rows.length === 0 ? (
          <View>
            <EmptyState
              title="No customers yet"
              subtitle="Add customers to start tracking bills and payments."
            />
            <PrimaryButton
              title="Create customer"
              onPress={() => {
                setPickerOpen(false);
                openAdd();
              }}
            />
          </View>
        ) : (
          rows.map(row => {
            const active =
              String(row.customer._id) === String(selected?.customer?._id);
            return (
              <TouchableOpacity
                key={row.customer._id}
                style={styles.pickRow}
                onPress={() => {
                  setSelectedId(row.customer._id);
                  setPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.pickMain}>
                  <Text style={styles.pickName}>{row.customer.name}</Text>
                  <Text style={styles.pickSub}>
                    {row.balance > 0
                      ? `${formatMoney(row.balance)} due`
                      : row.balance < 0
                        ? `${formatMoney(-row.balance)} advance`
                        : 'Settled'}
                  </Text>
                </View>
                {active ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={21}
                    color={GREEN}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </SheetModal>

      <SheetModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter transactions"
      >
        {FILTERS.map(filter => {
          const active = typeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={styles.pickRow}
              onPress={() => {
                setTypeFilter(filter.key);
                setFilterOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.pickName, active && { color: NAVY }]}
              >
                {filter.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark-circle" size={21} color={GREEN} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </SheetModal>

      <SheetModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create customer"
      >
        <Field
          label="Name"
          value={form.name}
          onChangeText={v => setFormField('name', v)}
          placeholder="Customer name"
        />
        <Field
          label="Phone (optional)"
          value={form.phone}
          onChangeText={v => setFormField('phone', v)}
          placeholder="9876543210"
          keyboardType="phone-pad"
        />
        <Field
          label="Address (optional)"
          value={form.address}
          onChangeText={v => setFormField('address', v)}
          placeholder="City / area"
        />
        <Field
          label="Opening balance (optional)"
          value={form.openingBalance}
          onChangeText={v => setFormField('openingBalance', v)}
          placeholder="0"
          keyboardType="numeric"
        />
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <PrimaryButton
          title={formBusy ? 'Creating…' : 'Create customer'}
          onPress={createLedger}
          disabled={formBusy}
          style={styles.formSubmit}
        />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: BG,
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: -0.3,
  },
  customerPick: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    flexShrink: 1,
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3C6C3',
    backgroundColor: '#FDECEC',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: RED,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    padding: 16,
  },
  emptyCreate: {
    marginTop: 14,
  },
  outstandingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: NAVY,
    padding: 18,
  },
  outstandingLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: 'rgba(255,255,255,0.6)',
  },
  outstandingAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: YELLOW,
    marginTop: 7,
    letterSpacing: -0.5,
  },
  outstandingSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 5,
    marginBottom: 15,
  },
  outstandingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: NAVY,
  },
  statementBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statementBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: WHITE,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 5,
    letterSpacing: -0.2,
  },
  valueNavy: {
    color: NAVY,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: TEXT,
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    borderColor: YELLOW,
    backgroundColor: '#FFF8E7',
  },
  historyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  historyEmpty: {
    padding: 16,
  },
  txnRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  txnDate: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  txnDay: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },
  txnMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
    marginTop: 1,
  },
  markerCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: BORDER,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: YELLOW,
    borderWidth: 2.5,
    borderColor: WHITE,
  },
  txnBody: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 6,
    justifyContent: 'center',
  },
  txnTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT,
  },
  txnRef: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#33507A',
    marginTop: 2,
  },
  txnDesc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  txnBalance: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    marginTop: 4,
  },
  txnAmountCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: 110,
    marginLeft: 6,
  },
  txnAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  amountBill: {
    color: RED,
  },
  amountPay: {
    color: GREEN,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F5F9',
  },
  pickMain: {
    flex: 1,
    paddingRight: 10,
  },
  pickName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT,
  },
  pickSub: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 2,
  },
  formError: {
    fontSize: 13,
    fontWeight: '600',
    color: RED,
    marginTop: -4,
    marginBottom: 8,
  },
  formSubmit: {
    marginTop: 4,
  },
});
