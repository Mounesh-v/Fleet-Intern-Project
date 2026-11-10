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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, EmptyState, Loading } from '../../components/UI';
import {
  fetchCustomerStatement,
  formatMoney,
  formatDay,
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

const dayOf = value => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return String(d.getDate()).padStart(2, '0');
};

const monthYearOf = value => {
  const d = value ? new Date(value) : null;
  if (d && !Number.isNaN(d.getTime())) {
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
      d.getFullYear(),
    ).slice(2)}`;
  }
  return '';
};

const TYPE_TITLES = {
  OPENING: 'Opening balance',
  BILL: 'Bill generated',
  PAYMENT: 'Payment received',
};

/**
 * AdminStatementScreen — customer account statement from
 * GET /admin/customers/:id/statement: opening balance, chronological
 * bills and payments with running balances, and opening/billed/paid/
 * closing totals. Opened from the ledger's Statement action.
 */
export default function AdminStatementScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const customerId = route?.params?.customerId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!customerId) {
      setError('No customer selected.');
      setLoading(false);
      return;
    }
    try {
      const result = await fetchCustomerStatement(customerId);
      setData(result);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the statement.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <Loading label="Loading statement…" />;
  }

  const header = (
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
        <Text style={styles.title}>Statement</Text>
        <Text style={styles.subtitle}>
          {data?.customer?.name || 'Customer account'}
        </Text>
      </View>
    </View>
  );

  if (error && !data) {
    return (
      <Screen style={styles.screen}>
        {header}
        <View style={styles.emptyCard}>
          <EmptyState title="Could not load statement" subtitle={error} />
        </View>
        <TouchableOpacity style={styles.retryBtn} onPress={load} hitSlop={8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const customer = data?.customer || {};
  const totals = data?.totals || {};
  const transactions = data?.transactions || [];

  const closing = Number(totals.closingBalance) || 0;
  const closingColor = closing > 0 ? RED : closing < 0 ? GREEN : MUTED;
  const closingHint = closing > 0 ? 'due' : closing < 0 ? 'advance' : 'settled';

  const contact = [customer.phone, customer.address]
    .filter(Boolean)
    .join(' · ');

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
        {header}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.customerCard}>
          <Text style={styles.customerName}>{customer.name}</Text>
          {contact ? <Text style={styles.customerMeta}>{contact}</Text> : null}
          {customer.gstNo ? (
            <Text style={styles.customerMeta}>GST {customer.gstNo}</Text>
          ) : null}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Opening balance</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    (Number(totals.openingBalance) || 0) > 0 ? RED : MUTED,
                },
              ]}
            >
              {formatMoney(totals.openingBalance)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total billed</Text>
            <Text style={[styles.summaryValue, styles.valueNavy]}>
              {formatMoney(totals.billed)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total paid</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: (Number(totals.paid) || 0) > 0 ? GREEN : MUTED },
              ]}
            >
              {formatMoney(totals.paid)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Closing balance</Text>
            <Text style={[styles.summaryValue, { color: closingColor }]}>
              {formatMoney(closing)}
            </Text>
            <Text style={[styles.summaryHint, { color: closingColor }]}>
              {closingHint}
            </Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <Text style={styles.sectionMeta}>
            {`${totals.bills || 0} bills · ${totals.payments || 0} payments`}
          </Text>
        </View>

        <View style={styles.historyCard}>
          {transactions.length === 0 ? (
            <View style={styles.historyEmpty}>
              <EmptyState
                title="No transactions yet"
                subtitle="Bills and payments appear here as they are recorded."
              />
            </View>
          ) : (
            transactions.map(txn => {
              const increases =
                txn.type === 'BILL' ||
                (txn.type === 'OPENING' && txn.amount >= 0);
              const balance = Number(txn.balance) || 0;
              return (
                <View key={txn.id} style={styles.txnRow}>
                  <View style={styles.txnDate}>
                    <Text style={styles.txnDay}>{dayOf(txn.date)}</Text>
                    <Text style={styles.txnMonth}>{monthYearOf(txn.date)}</Text>
                  </View>

                  <View style={styles.markerCol}>
                    <View style={styles.markerLine} />
                    <View
                      style={[
                        styles.markerDot,
                        txn.type === 'PAYMENT' && styles.markerDotPay,
                        txn.type === 'OPENING' && styles.markerDotOpening,
                      ]}
                    />
                  </View>

                  <View style={styles.txnBody}>
                    <Text style={styles.txnTitle}>
                      {TYPE_TITLES[txn.type] || txn.type}
                    </Text>
                    {txn.reference ? (
                      <Text style={styles.txnRef}>Ref {txn.reference}</Text>
                    ) : null}
                    {txn.description ? (
                      <Text style={styles.txnDesc}>{txn.description}</Text>
                    ) : null}
                    <Text style={styles.txnBalance}>
                      {balance > 0
                        ? `Balance ${formatMoney(balance)}`
                        : balance < 0
                          ? `Advance ${formatMoney(-balance)}`
                          : 'Settled'}
                    </Text>
                  </View>

                  <View style={styles.txnAmountCol}>
                    <Text
                      style={[
                        styles.txnAmount,
                        increases ? styles.amountBill : styles.amountPay,
                      ]}
                      numberOfLines={1}
                    >
                      {increases ? '+' : '−'}
                      {formatMoney(Math.abs(txn.amount))}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.hint}>
          Opening balance + billed − paid = closing balance
        </Text>
        <Text style={styles.generated}>
          {`As of ${formatDay(new Date())}`}
        </Text>
      </ScrollView>
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
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    marginTop: 3,
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
  retryBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: YELLOW,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
    color: NAVY,
  },
  customerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    padding: 16,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: -0.2,
  },
  customerMeta: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 12,
  },
  summaryCard: {
    width: '50%',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  summaryHint: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valueNavy: {
    color: NAVY,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: TEXT,
  },
  sectionMeta: {
    fontSize: 11.5,
    fontWeight: '700',
    color: MUTED,
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
    backgroundColor: RED,
    borderWidth: 2.5,
    borderColor: WHITE,
  },
  markerDotPay: {
    backgroundColor: GREEN,
  },
  markerDotOpening: {
    backgroundColor: NAVY,
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
  hint: {
    fontSize: 11.5,
    color: MUTED,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 24,
  },
  generated: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
});
