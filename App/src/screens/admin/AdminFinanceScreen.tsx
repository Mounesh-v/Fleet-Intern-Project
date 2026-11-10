// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from 'react-native';
import {
  Screen,
  Card,
  Field,
  PrimaryButton,
  Chip,
  StatCard,
  EmptyState,
  Loading,
} from '../../components/UI';
import { useCustomAlert } from '../../components/CustomAlert';
import { C, S, T } from '../../themeCompat';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  fetchPayments,
  fetchExpenses,
  fetchCustomers,
  fetchVehicles,
  fetchWorkEntries,
  createPayment,
  createExpense,
  removePayment,
  removePayments,
  removeExpense,
  removeExpenses,
  formatMoney,
  formatDay,
} from '../../services/adminService';
import {
  Dropdown,
  DatePickerField,
  LabeledInput,
  SectionCard,
  SubmitButton,
  InfoBanner,
} from '../../components/FormControls';

const SCREEN_H = Dimensions.get('window').height;
const PAY_MODES = ['CASH', 'UPI', 'BANK', 'CHEQUE'];
const EXPENSE_KINDS = [
  { key: 'OPERATING', label: 'Operating' },
  { key: 'VEHICLE', label: 'Vehicle' },
];
const KIND_CATEGORIES = {
  OPERATING: ['DIESEL', 'TOLL', 'FOOD', 'REPAIR', 'SPARE_PARTS', 'DRIVER_BATA', 'OTHER'],
  VEHICLE: ['INSURANCE', 'SERVICE', 'FC', 'EMI', 'OTHER'],
};
const CATEGORY_ICONS = {
  DIESEL: 'flame',
  TOLL: 'cash',
  FOOD: 'restaurant',
  REPAIR: 'construct',
  SPARE_PARTS: 'build',
  DRIVER_BATA: 'people',
  OTHER: 'ellipsis-horizontal',
  INSURANCE: 'shield',
  SERVICE: 'settings',
  FC: 'document-text',
  EMI: 'card',
};
const CATEGORY_LABELS = {
  DIESEL: 'Diesel',
  TOLL: 'Toll',
  FOOD: 'Food',
  REPAIR: 'Repair',
  SPARE_PARTS: 'Spare Parts',
  DRIVER_BATA: 'Driver Bata',
  OTHER: 'Other',
  INSURANCE: 'Insurance',
  SERVICE: 'Service',
  FC: 'FC',
  EMI: 'EMI',
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
 * AdminFinanceScreen — payments received and expenses recorded, live
 * from GET /api/admin/payments and /api/admin/expenses. The dashboard's
 * Payment / Add Expense quick actions land here via route params and
 * open the matching create form (both backed by existing POST routes).
 */
export default function AdminFinanceScreen({ route, navigation }) {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [selKind, setSelKind] = useState('');
  const [selected, setSelected] = useState({});
  const { alert, alertNode } = useCustomAlert();

  const load = useCallback(async () => {
    try {
      const [p, e, c, v] = await Promise.all([
        fetchPayments(),
        fetchExpenses(),
        fetchCustomers(),
        fetchVehicles(),
      ]);
      setPayments(p.payments || []);
      setExpenses(e.expenses || []);
      setCustomers(c.customers || []);
      setVehicles(v.vehicles || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load finance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Dashboard quick actions: open the form once, then clear the param.
  useEffect(() => {
    const open = route?.params?.open;
    if (open === 'payment') {
      setPaymentOpen(true);
      navigation.setParams({ open: undefined });
    } else if (open === 'expense') {
      setExpenseOpen(true);
      navigation.setParams({ open: undefined });
    }
  }, [route?.params?.open, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleSelect = item => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[item._id]) delete next[item._id];
      else next[item._id] = true;
      return next;
    });
  };

  const handleLongPress = (kind, item) => {
    if (selKind === kind) {
      toggleSelect(item);
      return;
    }
    setSelKind(kind);
    setSelected({ [item._id]: true });
  };

  const exitSelect = () => {
    setSelKind('');
    setSelected({});
  };

  const toggleSelectAll = () => {
    const list = selKind === 'payment' ? payments : expenses;
    const count = Object.keys(selected).length;
    if (count > 0 && count === list.length) {
      setSelected({});
      return;
    }
    const next = {};
    list.forEach(item => {
      next[item._id] = true;
    });
    setSelected(next);
  };

  const deleteSelected = () => {
    const ids = Object.keys(selected);
    if (!ids.length) return;
    const isPay = selKind === 'payment';
    const noun =
      ids.length === 1
        ? isPay
          ? 'payment'
          : 'expense'
        : isPay
          ? 'payments'
          : 'expenses';
    alert(
      'Delete selected items',
      `${ids.length} ${noun} will be permanently deleted. This cannot be undone.`,
      {
        type: 'error',
        cancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            if (isPay) await removePayments(ids);
            else await removeExpenses(ids);
            exitSelect();
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  const deletePayment = payment => {
    alert(
      'Delete payment',
      `${payment.customer?.name || 'Payment'} · ${formatMoney(payment.amount)} — this cannot be undone.`,
      {
        type: 'error',
        cancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await removePayment(payment._id);
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  const deleteExpense = expense => {
    alert(
      'Delete expense',
      `${expense.category} · ${formatMoney(expense.amount)} — this cannot be undone.`,
      {
        type: 'error',
        cancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await removeExpense(expense._id);
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  if (loading) {
    return <Loading label="Loading finance…" />;
  }

  if (error && payments.length === 0 && expenses.length === 0) {
    return (
      <Screen style={styles.center}>
        <EmptyState title="Could not load finance" subtitle={error} />
        <View style={styles.retry}>
          <PrimaryButton title="Retry" onPress={load} />
        </View>
      </Screen>
    );
  }

  const received = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const spent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const net = received - spent;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, selKind && styles.contentSelecting]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Finance</Text>
              <Text style={styles.headerSubtitle}>
                {`${payments.length} ${payments.length === 1 ? 'payment' : 'payments'} · ${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} recorded`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                alert('Add to finance', 'Record a customer payment or an operating expense.', {
                  type: 'info',
                  cancel: true,
                  confirmText: 'Record payment',
                  onConfirm: () => setPaymentOpen(true),
                  extraText: 'Add expense',
                  onExtra: () => setExpenseOpen(true),
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={19} color="#182F50" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <StatCard
              label="Payments received"
              value={formatMoney(received)}
              hint={`${payments.length} recorded`}
              tone="green"
              icon="↓"
            />
          </View>
          <View style={styles.gridItem}>
            <StatCard
              label="Expenses recorded"
              value={formatMoney(spent)}
              hint={`${expenses.length} recorded`}
              tone="red"
              icon="↑"
            />
          </View>
          <View style={styles.gridItem}>
            <StatCard
              label="Net"
              value={formatMoney(net)}
              hint="received − spent"
              tone={net >= 0 ? 'green' : 'red'}
              icon="±"
            />
          </View>
          <View style={styles.gridItem}>
            <StatCard
              label="Vehicles"
              value={String(vehicles.length)}
              hint="in fleet"
              tone="blue"
              icon="JCB"
            />
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Payments received</Text>
          <TouchableOpacity
            style={styles.sectionAddBtn}
            onPress={() => setPaymentOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#182F50" />
            <Text style={styles.sectionAddText}>Record payment</Text>
          </TouchableOpacity>
        </View>
        {payments.length === 0 ? (
          <Card>
            <EmptyState
              title="No payments yet"
              subtitle="Customer payments you record appear here."
            />
          </Card>
        ) : (
          payments.map(payment => (
            <Card
              key={payment._id}
              style={[
                styles.rowCard,
                selKind === 'payment' && selected[payment._id] && styles.rowSelected,
              ]}
            >
              <TouchableOpacity
                style={styles.rowBody}
                onPress={() =>
                  selKind === 'payment' ? toggleSelect(payment) : deletePayment(payment)
                }
                onLongPress={() => handleLongPress('payment', payment)}
                delayLongPress={350}
                activeOpacity={0.7}
              >
                {selKind === 'payment' ? (
                  <View
                    style={[styles.checkCircle, selected[payment._id] && styles.checkCircleOn]}
                  >
                    {selected[payment._id] ? (
                      <Ionicons name="checkmark" size={14} color="#FFFDFA" />
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>
                    {payment.customer?.name || 'Unknown customer'}
                  </Text>
                  <Text style={styles.rowSub}>
                    {formatDay(payment.date)} · {payment.mode || 'CASH'}
                    {payment.reference ? ` · ${payment.reference}` : ''}
                  </Text>
                </View>
                <Text style={styles.amountIn}>{formatMoney(payment.amount)}</Text>
                {selKind === 'payment' ? null : (
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={C.danger}
                    style={styles.rowTrash}
                  />
                )}
              </TouchableOpacity>
            </Card>
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <TouchableOpacity
            style={styles.sectionAddBtnAlt}
            onPress={() => setExpenseOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#C43D35" />
            <Text style={styles.sectionAddTextAlt}>Add expense</Text>
          </TouchableOpacity>
        </View>
        {expenses.length === 0 ? (
          <Card>
            <EmptyState
              title="No expenses yet"
              subtitle="Operating and vehicle expenses you record appear here."
            />
          </Card>
        ) : (
          expenses.map(expense => (
            <Card
              key={expense._id}
              style={[
                styles.rowCard,
                selKind === 'expense' && selected[expense._id] && styles.rowSelected,
              ]}
            >
              <TouchableOpacity
                style={styles.rowBody}
                onPress={() =>
                  selKind === 'expense' ? toggleSelect(expense) : deleteExpense(expense)
                }
                onLongPress={() => handleLongPress('expense', expense)}
                delayLongPress={350}
                activeOpacity={0.7}
              >
                {selKind === 'expense' ? (
                  <View
                    style={[styles.checkCircle, selected[expense._id] && styles.checkCircleOn]}
                  >
                    {selected[expense._id] ? (
                      <Ionicons name="checkmark" size={14} color="#FFFDFA" />
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{expense.category}</Text>
                  <Text style={styles.rowSub}>
                    {formatDay(expense.date)} ·{' '}
                    {expense.kind === 'VEHICLE' ? 'Vehicle' : 'Operating'}
                    {expense.vehicle ? ` · ${expense.vehicle.registrationNo}` : ''}
                    {expense.litres ? ` · ${expense.litres} L` : ''}
                  </Text>
                </View>
                <Text style={styles.amountOut}>{formatMoney(expense.amount)}</Text>
                {selKind === 'expense' ? null : (
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={C.danger}
                    style={styles.rowTrash}
                  />
                )}
              </TouchableOpacity>
            </Card>
          ))
        )}

        <Text style={styles.hint}>
          Tap an item to delete — long-press to select multiple
        </Text>
      </ScrollView>

      {selKind ? (
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
              Object.keys(selected).length ===
                (selKind === 'payment' ? payments : expenses).length
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

      <PaymentModal
        visible={paymentOpen}
        customers={customers}
        onClose={() => setPaymentOpen(false)}
        onSaved={load}
      />
      <ExpenseModal
        visible={expenseOpen}
        vehicles={vehicles}
        onClose={() => setExpenseOpen(false)}
        onSaved={load}
      />
      {alertNode}
    </Screen>
  );
}

/**
 * Sheet — shared bottom-sheet shell for the finance modals: grows from
 * the bottom on open, collapses + fades on close before unmounting, and
 * the grabber drags to resize between the content height and 90% of the
 * screen (pull down from the collapsed state to dismiss).
 */
function Sheet({ visible, onClose, title, children }) {
  const [shown, setShown] = useState(false);
  const [contentH, setContentH] = useState(0);
  const backdrop = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const enteredRef = useRef(false);
  const dragStartH = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => {
    if (visible) {
      enteredRef.current = false;
      setShown(true);
      backdrop.setValue(0);
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setShown(false);
    });
  }, [visible, backdrop, heightAnim]);

  useEffect(() => {
    if (visible && shown && contentH > 0 && !enteredRef.current) {
      enteredRef.current = true;
      const target = Math.min(contentH, Math.round(SCREEN_H * 0.9));
      heightRef.current = 0;
      heightAnim.setValue(0);
      Animated.timing(heightAnim, {
        toValue: target,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) heightRef.current = target;
      });
    }
  }, [visible, shown, contentH, heightAnim]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      setContentH(h => (h > 0 ? h : Math.round(SCREEN_H * 0.55)));
    }, 400);
    return () => clearTimeout(timer);
  }, [visible]);

  const MAX_H = Math.round(SCREEN_H * 0.9);
  const MIN_H = contentH > 0 ? Math.min(contentH, MAX_H) : 0;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => visible,
    onMoveShouldSetPanResponder: (_, g) => visible && Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      if (!visible) return;
      heightAnim.stopAnimation(h => {
        dragStartH.current = h;
        heightRef.current = h;
      });
    },
    onPanResponderMove: (_, g) => {
      if (!visible) return;
      const lo = Math.min(MIN_H, dragStartH.current);
      const next = Math.max(lo, Math.min(MAX_H, dragStartH.current - g.dy));
      heightRef.current = next;
      heightAnim.setValue(next);
    },
    onPanResponderRelease: (_, g) => {
      if (!visible) return;
      if (Math.abs(g.dy) < 4 && Math.abs(g.vy) < 0.3) return;
      if (
        dragStartH.current <= MIN_H + 1 &&
        g.dy > 0 &&
        (g.dy > 70 || g.vy > 0.8)
      ) {
        onClose();
        return;
      }
      const h = heightRef.current;
      const target = Math.abs(h - MIN_H) <= Math.abs(h - MAX_H) ? MIN_H : MAX_H;
      Animated.spring(heightAnim, {
        toValue: target,
        useNativeDriver: false,
        bounciness: 5,
        speed: 16,
      }).start(({ finished }) => {
        if (finished) heightRef.current = target;
      });
    },
    onPanResponderTerminate: () => {
      if (!visible) return;
      const h = heightRef.current;
      const target = Math.abs(h - MIN_H) <= Math.abs(h - MAX_H) ? MIN_H : MAX_H;
      Animated.spring(heightAnim, {
        toValue: target,
        useNativeDriver: false,
      }).start();
    },
  });

  return (
    <Modal visible={shown} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.modalShell, { opacity: backdrop }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetLayer}
        >
          <Animated.View style={[styles.sheet, { height: heightAnim }]}>
            <View style={styles.grabber} {...pan.panHandlers}>
              <View style={styles.grabberBar} />
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={styles.sheetBody}
                onLayout={e => setContentH(e.nativeEvent.layout.height)}
              >
                {children}
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

/**
 * PaymentModal — record a customer payment against POST /api/admin/payments.
 */
function PaymentModal({ visible, customers, onClose, onSaved }) {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const { alert, alertNode } = useCustomAlert();

  useEffect(() => {
    if (visible) {
      setCustomerId('');
      setAmount('');
      setDate(today());
      setMode('CASH');
      setReference('');
      setNotes('');
      setBusy(false);
    }
  }, [visible]);

  const save = async () => {
    if (busy) return;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date.trim())) {
      alert('Payment', 'Enter the date as DD/MM/YYYY.', { type: 'warning' });
      return;
    }
    if (!amount.trim() || !/^\d+(\.\d+)?$/.test(amount.trim()) || Number(amount) <= 0) {
      alert('Payment', 'Enter an amount greater than 0.', { type: 'warning' });
      return;
    }
    if (!customerId) {
      alert('Payment', customers.length === 0
        ? 'No customers registered yet.'
        : 'Choose the customer who paid.', { type: 'warning' });
      return;
    }

    setBusy(true);
    try {
      await createPayment({
        customer: customerId,
        amount: Number(amount),
        date: toIsoDate(date.trim()),
        mode,
        reference: reference.trim(),
        notes: notes.trim(),
      });
      alert('Payment recorded', 'The payment has been saved.', { type: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      alert(
        'Payment',
        err instanceof Error ? err.message : 'Could not save the payment.',
        { type: 'error' },
      );
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose} title="Record payment">
        <Text style={styles.sectionNote}>
          Money received from a customer — saved against your payment records.
        </Text>

          <Text style={styles.fieldLabel}>Customer</Text>
          <View style={styles.chipRow}>
            {customers.map(customer => (
              <Chip
                key={customer._id}
                label={customer.name}
                selected={customerId === customer._id}
                onPress={() => setCustomerId(customer._id)}
              />
            ))}
            {customers.length === 0 ? (
              <Text style={styles.emptyNote}>No customers registered yet.</Text>
            ) : null}
          </View>

          <Field
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="e.g. 5000"
          />
          <Field label="Date" value={date} onChangeText={setDate} placeholder="DD/MM/YYYY" />

          <Text style={styles.fieldLabel}>Mode</Text>
          <View style={styles.chipRow}>
            {PAY_MODES.map(item => (
              <Chip
                key={item}
                label={item}
                selected={mode === item}
                onPress={() => setMode(item)}
              />
            ))}
          </View>

          <Field
            label="Reference (optional)"
            value={reference}
            onChangeText={setReference}
            placeholder="UTR / cheque number"
          />
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />

          <PrimaryButton
            title={busy ? 'Saving…' : 'Save payment'}
            onPress={save}
            disabled={busy}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
      </Sheet>
      {alertNode}
    </>
  );
}

/**
 * ExpenseModal — record an operating/vehicle expense against
 * POST /api/admin/expenses. Category choices follow the server's
 * CATEGORIES_BY_KIND rule (kind → allowed categories).
 */
function ExpenseModal({ visible, vehicles, onClose, onSaved }) {
  const [kind, setKind] = useState('OPERATING');
  const [category, setCategory] = useState(KIND_CATEGORIES.OPERATING[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [vehicleId, setVehicleId] = useState('');
  const [litres, setLitres] = useState('');
  const [notes, setNotes] = useState('');
  const [workEntryId, setWorkEntryId] = useState('');
  const [entries, setEntries] = useState([]);
  const [openSelect, setOpenSelect] = useState('');
  const [busy, setBusy] = useState(false);
  const { alert, alertNode } = useCustomAlert();

  useEffect(() => {
    if (visible) {
      setKind('OPERATING');
      setCategory(KIND_CATEGORIES.OPERATING[0]);
      setAmount('');
      setDate(today());
      setVehicleId('');
      setLitres('');
      setNotes('');
      setWorkEntryId('');
      setOpenSelect('');
      setBusy(false);
      fetchWorkEntries('?limit=50')
        .then(data => setEntries(data.entries || []))
        .catch(() => setEntries([]));
    }
  }, [visible]);

  const pickKind = value => {
    setKind(value);
    setCategory(KIND_CATEGORIES[value][0]);
  };

  const save = async () => {
    if (busy) return;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date.trim())) {
      alert('Expense', 'Enter the date as DD/MM/YYYY.', { type: 'warning' });
      return;
    }
    if (!amount.trim() || !/^\d+(\.\d+)?$/.test(amount.trim()) || Number(amount) <= 0) {
      alert('Expense', 'Enter an amount greater than 0.', { type: 'warning' });
      return;
    }
    if (!isAmount(litres)) {
      alert('Expense', 'Litres must be a number.', { type: 'warning' });
      return;
    }

    setBusy(true);
    try {
      await createExpense({
        date: toIsoDate(date.trim()),
        kind,
        category,
        amount: Number(amount),
        vehicle: vehicleId || null,
        litres: Number(litres) || 0,
        notes: notes.trim(),
        workEntry: workEntryId || null,
      });
      alert('Expense recorded', 'The expense has been saved.', { type: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      alert(
        'Expense',
        err instanceof Error ? err.message : 'Could not save the expense.',
        { type: 'error' },
      );
      setBusy(false);
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
                <Text style={styles.formTitle}>Add Expense</Text>
                <Text style={styles.formSubtitle}>Track operating and vehicle spend</Text>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScroll}
            >
              <InfoBanner text="Operating or vehicle spend — saved against your expense records." />

              <SectionCard num="01" title="Expense details">
                <DatePickerField label="Date" value={date} onChange={setDate} />
                <Dropdown
                  label="Vehicle"
                  placeholder="Choose a vehicle (optional)"
                  emptyNote="No vehicles registered."
                  value={vehicleId}
                  options={[
                    { value: '', label: 'None' },
                    ...vehicles.map(vehicle => ({
                      value: vehicle._id,
                      label: vehicle.registrationNo,
                    })),
                  ]}
                  onChange={setVehicleId}
                  open={openSelect === 'vehicle'}
                  onToggle={() => setOpenSelect(openSelect === 'vehicle' ? '' : 'vehicle')}
                  icon="car-sport"
                />
              </SectionCard>

              <SectionCard num="02" title="Expense category">
                <View>
                  <Text style={styles.kindLabel}>Type</Text>
                  <View style={styles.kindRow}>
                    {EXPENSE_KINDS.map(item => (
                      <Chip
                        key={item.key}
                        label={item.label}
                        selected={kind === item.key}
                        onPress={() => pickKind(item.key)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.catGrid}>
                  {KIND_CATEGORIES[kind].map((cat, i) => {
                    const active = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catCard,
                          (i + 1) % 3 === 0 && styles.catCardNoGap,
                          active && styles.catCardOn,
                        ]}
                        onPress={() => setCategory(cat)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <View style={[styles.catIcon, active && styles.catIconOn]}>
                          <Ionicons
                            name={CATEGORY_ICONS[cat] || 'pricetag'}
                            size={17}
                            color="#182535"
                          />
                        </View>
                        <Text
                          style={[styles.catText, active && styles.catTextOn]}
                          numberOfLines={1}
                        >
                          {CATEGORY_LABELS[cat] || cat}
                        </Text>
                        {active ? (
                          <View style={styles.catCheck}>
                            <Ionicons name="checkmark" size={11} color="#182535" />
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SectionCard>

              <SectionCard num="03" title="Amount & description">
                <LabeledInput
                  label="Diesel litres (optional)"
                  value={litres}
                  onChangeText={setLitres}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  icon="water"
                />
                <LabeledInput
                  label="Expense amount"
                  prefix="₹"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 2500"
                  keyboardType="decimal-pad"
                />
                <LabeledInput
                  label="Description (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Short note about this expense"
                  multiline
                  icon="create"
                />
                <Dropdown
                  label="Link to work entry (optional)"
                  placeholder="None"
                  emptyNote="No work entries found."
                  value={workEntryId}
                  options={[
                    { value: '', label: 'None' },
                    ...entries.map(entry => ({
                      value: entry._id,
                      label: `${formatDay(entry.date)} · ${
                        entry.vehicle?.registrationNo || 'Vehicle'
                      }`,
                    })),
                  ]}
                  onChange={setWorkEntryId}
                  open={openSelect === 'entry'}
                  onToggle={() => setOpenSelect(openSelect === 'entry' ? '' : 'entry')}
                  icon="link"
                />
              </SectionCard>

              <SubmitButton
                title={busy ? 'Saving…' : 'Submit Expense'}
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

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: S.lg, alignSelf: 'stretch' },
  content: { paddingBottom: S.xxl },
  contentSelecting: { paddingBottom: 104 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.lg,
    marginBottom: S.md,
  },
  sectionTitle: { ...T.title, color: C.textPrimary, flexShrink: 1 },
  sectionAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F5B923',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    marginLeft: S.sm,
  },
  sectionAddText: { fontSize: 12, fontWeight: '800', color: '#182F50' },
  sectionAddBtnAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FBECEA',
    borderWidth: 1,
    borderColor: '#F0C9C5',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    marginLeft: S.sm,
  },
  sectionAddTextAlt: { fontSize: 12, fontWeight: '800', color: '#C43D35' },
  hint: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: S.md,
  },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  gridItem: { width: '50%', paddingHorizontal: S.xs, paddingBottom: S.sm },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
    marginBottom: S.sm,
  },
  rowBody: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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
  rowTrash: { marginLeft: S.sm },
  rowMain: { flex: 1, paddingRight: S.sm },
  rowTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  rowSub: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  amountIn: { fontSize: 15, fontWeight: '800', color: C.success },
  amountOut: { fontSize: 15, fontWeight: '800', color: C.danger },
  errorCard: { borderColor: C.danger, marginBottom: S.sm },
  errorText: { fontSize: 13, color: C.danger, fontWeight: '600' },
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: S.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md },
  emptyNote: { fontSize: 13, color: C.textSecondary, marginBottom: S.sm },
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
  kindLabel: { fontSize: 13, fontWeight: '700', color: '#182535', marginBottom: 7 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  catCard: {
    width: '31%',
    marginRight: '3.5%',
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 7,
  },
  catCardNoGap: { marginRight: 0 },
  catCardOn: { borderWidth: 2, borderColor: '#F5B923', backgroundColor: '#FFF2DE' },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF2DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconOn: { backgroundColor: '#F5B923' },
  catText: { fontSize: 11.5, fontWeight: '700', color: '#292D32', textAlign: 'center' },
  catTextOn: { color: '#182535', fontWeight: '800' },
  catCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F5B923',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
