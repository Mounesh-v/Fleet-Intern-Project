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
import { Screen, EmptyState, Loading } from '../../components/UI';
import {
  fetchWorkEntries,
  fetchPayments,
  formatMoney,
  typeLabel,
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

/**
 * AdminReportDetailScreen — driver-wise / customer-wise / vehicle-wise
 * performance for a period passed from Reports: work-entry billing
 * grouped by driver, customer or vehicle (plus payments received per
 * customer), with totals, share percentages and progress bars.
 */
export default function AdminReportDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const kindParam = route?.params?.kind;
  const kind =
    kindParam === 'customer' || kindParam === 'vehicle' ? kindParam : 'driver';
  const kindWord =
    kind === 'customer' ? 'customer' : kind === 'vehicle' ? 'vehicle' : 'driver';
  const kindWordPlural = `${kindWord}s`;
  const kindTitle = `${kindWord.charAt(0).toUpperCase()}${kindWord.slice(1)}-wise report`;
  const from = route?.params?.from;
  const to = route?.params?.to;
  const label = route?.params?.label || '';

  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const entryQuery =
        from && to ? `?from=${from}&to=${to}&limit=500` : '?limit=500';
      const entryPromise = fetchWorkEntries(entryQuery);
      const paymentPromise =
        kind === 'customer'
          ? fetchPayments(from && to ? `?from=${from}&to=${to}` : '')
          : Promise.resolve({ payments: [] });

      const [w, p] = await Promise.all([entryPromise, paymentPromise]);
      setEntries(w.entries || []);
      setPayments(p.payments || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kind, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const byKey = {};

    entries.forEach(entry => {
      const record =
        kind === 'customer'
          ? entry.customer
          : kind === 'vehicle'
            ? entry.vehicle
            : entry.driver;
      const id = record?._id || record;
      if (!id) return;
      const key = String(id);
      if (!byKey[key]) {
        byKey[key] = {
          id: key,
          name:
            (kind === 'vehicle' ? record?.registrationNo : record?.name) || '—',
          employeeId: record?.employeeId || '',
          phone: record?.phone || '',
          type: kind === 'vehicle' ? typeLabel(record?.type) : '',
          entries: 0,
          billed: 0,
          paid: 0,
        };
      }
      byKey[key].entries += 1;
      byKey[key].billed += entry.billedAmount || 0;
    });

    if (kind === 'customer') {
      payments.forEach(payment => {
        const record = payment.customer;
        const id = record?._id || record;
        if (!id) return;
        const key = String(id);
        if (!byKey[key]) {
          byKey[key] = {
            id: key,
            name: record?.name || '—',
            employeeId: '',
            phone: record?.phone || '',
            type: '',
            entries: 0,
            billed: 0,
            paid: 0,
          };
        }
        byKey[key].paid += payment.amount || 0;
      });
    }

    const list = Object.values(byKey).sort(
      (a, b) => b.billed - a.billed || b.paid - a.paid,
    );
    const totalBilled = list.reduce((sum, row) => sum + row.billed, 0);
    list.forEach(row => {
      row.share =
        totalBilled > 0 ? Math.round((row.billed / totalBilled) * 100) : 0;
    });
    return list;
  }, [entries, payments, kind]);

  const totals = useMemo(() => {
    const totalBilled = entries.reduce(
      (sum, entry) => sum + (entry.billedAmount || 0),
      0,
    );
    const totalPaid = payments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );
    return { count: entries.length, billed: totalBilled, paid: totalPaid };
  }, [entries, payments]);

  if (loading) {
    return <Loading label={`Loading ${kindWord} report…`} />;
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
        <Text style={styles.title}>{kindTitle}</Text>
        <Text style={styles.subtitle}>{label || 'All recorded work'}</Text>
      </View>
    </View>
  );

  if (error && entries.length === 0) {
    return (
      <Screen style={styles.screen}>
        {header}
        <View style={styles.emptyCard}>
          <EmptyState title="Could not load report" subtitle={error} />
        </View>
        <TouchableOpacity style={styles.retryBtn} onPress={load} hitSlop={8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Screen>
    );
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
        {header}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Entries</Text>
            <Text style={[styles.summaryValue, styles.valueNavy]}>
              {String(totals.count)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total billed</Text>
            <Text style={[styles.summaryValue, styles.valueNavy]}>
              {formatMoney(totals.billed)}
            </Text>
          </View>
          {kind === 'customer' ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total paid</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: totals.paid > 0 ? GREEN : MUTED },
                ]}
              >
                {formatMoney(totals.paid)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{`By ${kindWord}`}</Text>
          <Text style={styles.sectionMeta}>{`${rows.length} ${
            rows.length === 1 ? kindWord : kindWordPlural
          }`}</Text>
        </View>

        <View style={styles.card}>
          {rows.length === 0 ? (
            <EmptyState
              title="No work in this period"
              subtitle="Totals appear once work entries are recorded for the selected period."
            />
          ) : (
            rows.map(row => {
              const sub = [
                row.type,
                row.employeeId,
                row.phone,
                `${row.entries} ${row.entries === 1 ? 'entry' : 'entries'}`,
                kind === 'customer' && row.paid > 0
                  ? `Paid ${formatMoney(row.paid)}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <View key={row.id} style={styles.row}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {row.name}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {sub}
                      </Text>
                    </View>
                    <Text style={styles.rowValue}>
                      {formatMoney(row.billed)}
                    </Text>
                  </View>
                  <View style={styles.rowBarRow}>
                    <View style={styles.rowTrack}>
                      <View
                        style={[
                          styles.rowFill,
                          { width: `${Math.max(2, row.share)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.rowShare}>{row.share}%</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
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
    fontSize: 12.5,
    color: MUTED,
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
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
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
  sectionMeta: {
    fontSize: 11.5,
    fontWeight: '700',
    color: MUTED,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    padding: 14,
  },
  row: {
    marginBottom: 16,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    paddingRight: 10,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },
  rowSub: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '800',
    color: NAVY,
  },
  rowBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  rowTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EDF1F6',
    overflow: 'hidden',
  },
  rowFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  rowShare: {
    fontSize: 12,
    fontWeight: '800',
    color: NAVY,
    width: 38,
    textAlign: 'right',
  },
});
