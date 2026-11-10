// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  fetchDashboard,
  fetchWorkEntries,
  formatMoney,
  formatDay,
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
const ORANGE = '#E99A35';
const BORDER = '#E9E0D2';

const GREEN_ON_DARK = '#34D399';
const RED_ON_DARK = '#FF7B72';

const SEGMENTS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d, n) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
};

const isoDate = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

/** Range of the selected period (one day / week / month). */
function rangeFor(period, anchor) {
  const day = startOfDay(anchor);
  if (period === 'daily') return { from: day, to: day };
  if (period === 'weekly') {
    const ws = addDays(day, -day.getDay());
    return { from: ws, to: addDays(ws, 6) };
  }
  return {
    from: new Date(day.getFullYear(), day.getMonth(), 1),
    to: new Date(day.getFullYear(), day.getMonth() + 1, 0),
  };
}

/** Range covered by the bar chart (7 days / 6 weeks / 6 months). */
function chartRange(period, anchor) {
  if (period === 'daily') {
    return { from: addDays(startOfDay(anchor), -6), to: startOfDay(anchor) };
  }
  const { from, to } = rangeFor(period, anchor);
  if (period === 'weekly') {
    return { from: addDays(from, -35), to };
  }
  return { from: new Date(from.getFullYear(), from.getMonth() - 5, 1), to };
}

/** The period immediately before the selected one (always inside the chart). */
function prevRange(period, anchor) {
  if (period === 'daily') {
    const d = addDays(startOfDay(anchor), -1);
    return { from: d, to: d };
  }
  const { from } = rangeFor(period, anchor);
  if (period === 'weekly') {
    return { from: addDays(from, -7), to: addDays(from, -1) };
  }
  return {
    from: new Date(from.getFullYear(), from.getMonth() - 1, 1),
    to: new Date(from.getFullYear(), from.getMonth(), 0),
  };
}

/** One bucket per chart bar (day / week-start / month-start labels). */
function bucketsFor(period, anchor) {
  const list = [];
  if (period === 'daily') {
    const end = startOfDay(anchor);
    for (let i = 6; i >= 0; i--) {
      const d = addDays(end, -i);
      list.push({ label: String(d.getDate()), from: d, to: d });
    }
    return list;
  }
  if (period === 'weekly') {
    const { from } = rangeFor('weekly', anchor);
    for (let i = 5; i >= 0; i--) {
      const ws = addDays(from, -i * 7);
      list.push({
        label: `${ws.getDate()}/${ws.getMonth() + 1}`,
        from: ws,
        to: addDays(ws, 6),
      });
    }
    return list;
  }
  const { from } = rangeFor('monthly', anchor);
  for (let i = 5; i >= 0; i--) {
    const mf = new Date(from.getFullYear(), from.getMonth() - i, 1);
    list.push({
      label: MONTH_SHORT[mf.getMonth()],
      from: mf,
      to: new Date(mf.getFullYear(), mf.getMonth() + 1, 0),
    });
  }
  return list;
}

/** Sum income/expense/net over a day range from the dashboard series. */
function sumRange(seriesMap, from, to) {
  let income = 0;
  let expense = 0;
  let guard = 0;
  for (let d = startOfDay(from); d <= to && guard < 400; d = addDays(d, 1)) {
    guard += 1;
    const row = seriesMap.get(isoDate(d));
    if (row) {
      income += row.income || 0;
      expense += row.expense || 0;
    }
  }
  return { income, expense, net: income - expense };
}

/** Percentage change vs the previous period (0 base → 0 or 100). */
function pctChange(cur, prev) {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / Math.abs(prev)) * 100);
}

const signedMoney = value =>
  value < 0 ? `−${formatMoney(Math.abs(value))}` : formatMoney(value);

/**
 * AdminReportsScreen — business performance from the design spec:
 * daily/weekly/monthly period selector with prev/next navigation, a
 * navy net-profit card with a bar chart, revenue/expenses split cards,
 * vehicle performance for the selected period and report quick links.
 *
 * Period totals are summed client-side from GET /admin/dashboard
 * series (totals are all-time); vehicle performance comes from
 * GET /admin/work-entries filtered by the selected period.
 */
export default function AdminReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const [period, setPeriod] = useState('monthly');
  const [anchor, setAnchor] = useState(() => new Date());
  const [stats, setStats] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const chart = chartRange(period, anchor);
    const current = rangeFor(period, anchor);
    try {
      const [d, w] = await Promise.all([
        fetchDashboard(
          `?from=${isoDate(chart.from)}&to=${isoDate(chart.to)}`,
        ),
        fetchWorkEntries(
          `?from=${isoDate(current.from)}&to=${isoDate(current.to)}&limit=500`,
        ),
      ]);
      setStats(d);
      setEntries(w.entries || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  const changePeriod = next => {
    if (next !== period) setPeriod(next);
  };

  const shiftAnchor = dir => {
    setAnchor(prev => {
      if (period === 'daily') return addDays(prev, dir);
      if (period === 'weekly') return addDays(prev, dir * 7);
      const year = prev.getFullYear();
      const month = prev.getMonth() + dir;
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(prev.getDate(), lastDay));
    });
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const seriesMap = useMemo(() => {
    const map = new Map();
    (stats?.series || []).forEach(row => map.set(row.date, row));
    return map;
  }, [stats]);

  // Vehicle billed totals for the selected period (top billed first).
  const vehicleRows = useMemo(() => {
    const byVehicle = {};
    let total = 0;
    entries.forEach(entry => {
      if (!entry.vehicle) return;
      const reg = entry.vehicle.registrationNo || '—';
      if (!byVehicle[reg]) {
        byVehicle[reg] = {
          reg,
          type: typeLabel(entry.vehicle.type),
          billed: 0,
        };
      }
      byVehicle[reg].billed += entry.billedAmount || 0;
      total += entry.billedAmount || 0;
    });
    const list = Object.values(byVehicle).sort((a, b) => b.billed - a.billed);
    list.forEach(row => {
      row.share = total > 0 ? Math.round((row.billed / total) * 100) : 0;
    });
    return list;
  }, [entries]);

  if (loading && !stats) {
    return <Loading label="Loading reports…" />;
  }

  if (error && !stats) {
    return (
      <Screen style={styles.screen}>
        <View
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
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
            <Text style={styles.title}>Reports & analytics</Text>
            <Text style={styles.subtitle}>Business performance</Text>
          </View>
        </View>
        <View style={styles.emptyCard}>
          <EmptyState title="Could not load reports" subtitle={error} />
        </View>
        <TouchableOpacity style={styles.retryBtn} onPress={load} hitSlop={8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const currentRange = rangeFor(period, anchor);
  const previousRange = prevRange(period, anchor);
  const todayStart = startOfDay(new Date());
  const nextDisabled = currentRange.to >= todayStart;

  const periodTitle =
    period === 'daily'
      ? formatDay(anchor)
      : period === 'weekly'
        ? `${formatDay(currentRange.from)} – ${formatDay(currentRange.to)}`
        : `${MONTH_LONG[currentRange.from.getMonth()]} ${currentRange.from.getFullYear()}`;

  const openVehicleReport = () =>
    navigation.navigate('ReportDetail', {
      kind: 'vehicle',
      from: isoDate(currentRange.from),
      to: isoDate(currentRange.to),
      label: periodTitle,
    });

  const cur = sumRange(seriesMap, currentRange.from, currentRange.to);
  const prev = sumRange(seriesMap, previousRange.from, previousRange.to);

  const netPct = pctChange(cur.net, prev.net);
  const revPct = pctChange(cur.income, prev.income);
  const expPct = pctChange(cur.expense, prev.expense);

  const buckets = bucketsFor(period, anchor);
  const bucketStats = buckets.map(bucket => ({
    ...bucket,
    ...sumRange(seriesMap, bucket.from, bucket.to),
  }));
  const maxAbs = Math.max(
    1,
    ...bucketStats.map(b => Math.abs(b.net)),
  );
  const maxNet = Math.max(...bucketStats.map(b => b.net));
  const hotIndex = maxNet > 0 ? bucketStats.findIndex(b => b.net === maxNet) : -1;

  const barHeight = bucket => {
    if (bucket.income === 0 && bucket.expense === 0) return 4;
    return Math.max(4, Math.round((Math.abs(bucket.net) / maxAbs) * 58));
  };

  const visibleVehicles = vehicleRows.slice(0, 3);

  const reportRows = [
    {
      key: 'vehicle',
      icon: 'car-sport-outline',
      title: 'Vehicle-wise report',
      onPress: openVehicleReport,
    },
    {
      key: 'driver',
      icon: 'person-outline',
      title: 'Driver-wise report',
      onPress: () =>
        navigation.navigate('ReportDetail', {
          kind: 'driver',
          from: isoDate(currentRange.from),
          to: isoDate(currentRange.to),
          label: periodTitle,
        }),
    },
    {
      key: 'customer',
      icon: 'people-outline',
      title: 'Customer-wise report',
      onPress: () =>
        navigation.navigate('ReportDetail', {
          kind: 'customer',
          from: isoDate(currentRange.from),
          to: isoDate(currentRange.to),
          label: periodTitle,
        }),
    },
    {
      key: 'daily',
      icon: 'today-outline',
      title: 'Daily report',
      onPress: () => {
        setPeriod('daily');
        scrollToTop();
      },
    },
    {
      key: 'monthly',
      icon: 'calendar-outline',
      title: 'Monthly report',
      onPress: () => {
        setPeriod('monthly');
        scrollToTop();
      },
    },
  ];

  const netColor =
    netPct === 0 ? MUTED : netPct > 0 ? GREEN_ON_DARK : RED_ON_DARK;
  const revColor = revPct === 0 ? MUTED : revPct > 0 ? GREEN : RED;
  const expColor = expPct === 0 ? MUTED : expPct < 0 ? GREEN : RED;

  const periodWord =
    period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';

  return (
    <Screen style={styles.screen}>
      <ScrollView
        ref={scrollRef}
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
            <Text style={styles.title}>Reports & analytics</Text>
            <Text style={styles.subtitle}>Business performance</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.periodCard}>
          <View style={styles.segmentTrack}>
            {SEGMENTS.map(seg => (
              <TouchableOpacity
                key={seg.key}
                style={[
                  styles.segment,
                  period === seg.key && styles.segmentActive,
                ]}
                onPress={() => changePeriod(seg.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.segmentText,
                    period === seg.key && styles.segmentTextActive,
                  ]}
                >
                  {seg.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.periodRow}>
            <TouchableOpacity
              style={styles.navArrow}
              onPress={() => shiftAnchor(-1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Previous period"
            >
              <Ionicons name="chevron-back" size={18} color={NAVY} />
            </TouchableOpacity>
            <Text style={styles.periodTitle} numberOfLines={1}>
              {periodTitle}
            </Text>
            <TouchableOpacity
              style={[styles.navArrow, nextDisabled && styles.navArrowDisabled]}
              onPress={() => shiftAnchor(1)}
              disabled={nextDisabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Next period"
            >
              <Ionicons name="chevron-forward" size={18} color={NAVY} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.netCard}>
          <View style={styles.netTop}>
            <View style={styles.netHeadline}>
              <Text style={styles.netLabel}>NET PROFIT</Text>
              <Text style={styles.netAmount}>{signedMoney(cur.net)}</Text>
            </View>
            <View style={styles.pctPill}>
              <Ionicons
                name={netPct >= 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={netColor}
              />
              <Text style={[styles.pctPillText, { color: netColor }]}>
                {Math.abs(netPct)}%
              </Text>
            </View>
          </View>
          <Text style={styles.netSub}>vs previous {periodWord}</Text>

          <View style={styles.chartRow}>
            {bucketStats.map((bucket, index) => (
              <View key={`${index}-${bucket.label}`} style={styles.chartCol}>
                <View style={styles.chartBarWrap}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: barHeight(bucket) },
                      index === hotIndex && styles.chartBarHot,
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{bucket.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.splitRow}>
          <View style={styles.splitCard}>
            <View style={[styles.splitIcon, styles.splitIconRevenue]}>
              <Ionicons name="trending-up" size={18} color={GREEN} />
            </View>
            <Text style={styles.splitLabel}>Revenue</Text>
            <Text style={styles.splitValue} numberOfLines={1}>
              {formatMoney(cur.income)}
            </Text>
            <View style={styles.splitPctRow}>
              <Ionicons
                name={revPct >= 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={revColor}
              />
              <Text style={[styles.splitPct, { color: revColor }]}>
                {Math.abs(revPct)}%
              </Text>
              <Text style={styles.splitVs}>vs previous</Text>
            </View>
          </View>

          <View style={styles.splitCard}>
            <View style={[styles.splitIcon, styles.splitIconExpenses]}>
              <Ionicons name="trending-down" size={18} color={ORANGE} />
            </View>
            <Text style={styles.splitLabel}>Expenses</Text>
            <Text style={styles.splitValue} numberOfLines={1}>
              {formatMoney(cur.expense)}
            </Text>
            <View style={styles.splitPctRow}>
              <Ionicons
                name={expPct >= 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={expColor}
              />
              <Text style={[styles.splitPct, { color: expColor }]}>
                {Math.abs(expPct)}%
              </Text>
              <Text style={styles.splitVs}>vs previous</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Vehicle performance</Text>
            <TouchableOpacity onPress={openVehicleReport} hitSlop={8}>
              <Text style={styles.cardAction}>View report</Text>
            </TouchableOpacity>
          </View>
          {vehicleRows.length === 0 ? (
            <EmptyState
              title="No work in this period"
              subtitle="Vehicle totals appear once work is recorded for the selected period."
            />
          ) : (
            visibleVehicles.map(vehicle => (
              <View key={vehicle.reg} style={styles.perfRow}>
                <View style={styles.perfTop}>
                  <View style={styles.perfMain}>
                    <Text style={styles.perfReg} numberOfLines={1}>
                      {vehicle.reg}
                    </Text>
                    <Text style={styles.perfType}>{vehicle.type}</Text>
                  </View>
                  <Text style={styles.perfBilled}>
                    {formatMoney(vehicle.billed)}
                  </Text>
                </View>
                <View style={styles.perfBarRow}>
                  <View style={styles.perfTrack}>
                    <View
                      style={[
                        styles.perfFill,
                        { width: `${Math.max(2, vehicle.share)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.perfPct}>{vehicle.share}%</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          {reportRows.map((row, index) => (
            <TouchableOpacity
              key={row.key}
              style={[
                styles.reportRow,
                index > 0 && styles.reportRowBorder,
              ]}
              onPress={row.onPress}
              activeOpacity={0.6}
            >
              <View style={styles.reportIcon}>
                <Ionicons name={row.icon} size={19} color="#33507A" />
              </View>
              <Text style={styles.reportTitle}>{row.title}</Text>
              <Ionicons name="chevron-forward" size={17} color={MUTED} />
            </TouchableOpacity>
          ))}
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
  periodCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    padding: 12,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F7',
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: WHITE,
    shadowColor: '#102030',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
  },
  segmentTextActive: {
    color: NAVY,
    fontWeight: '800',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  navArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    opacity: 0.35,
  },
  periodTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15.5,
    fontWeight: '800',
    color: NAVY,
    marginHorizontal: 8,
  },
  netCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: NAVY,
    padding: 18,
  },
  netTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  netHeadline: {
    flex: 1,
    paddingRight: 10,
  },
  netLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: 'rgba(255,255,255,0.6)',
  },
  netAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: WHITE,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  pctPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  pctPillText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  netSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 3,
    marginBottom: 14,
  },
  chartRow: {
    flexDirection: 'row',
    gap: 5,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarWrap: {
    height: 62,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '72%',
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  chartBarHot: {
    backgroundColor: YELLOW,
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 6,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  splitCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  splitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  splitIconRevenue: {
    backgroundColor: 'rgba(22, 132, 91, 0.12)',
  },
  splitIconExpenses: {
    backgroundColor: 'rgba(233, 154, 53, 0.14)',
  },
  splitLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  splitValue: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  splitPctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  splitPct: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  splitVs: {
    fontSize: 10.5,
    color: MUTED,
    fontWeight: '600',
    marginLeft: 2,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    padding: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '800',
    color: NAVY,
  },
  perfRow: {
    marginBottom: 14,
  },
  perfTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfMain: {
    flex: 1,
    paddingRight: 10,
  },
  perfReg: {
    fontSize: 13.5,
    fontWeight: '800',
    color: TEXT,
  },
  perfType: {
    fontSize: 11,
    color: MUTED,
    marginTop: 1,
  },
  perfBilled: {
    fontSize: 14,
    fontWeight: '800',
    color: NAVY,
  },
  perfPct: {
    fontSize: 12,
    fontWeight: '800',
    color: NAVY,
    width: 38,
    textAlign: 'right',
  },
  perfBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 7,
  },
  perfTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EDF1F6',
    overflow: 'hidden',
  },
  perfFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  reportRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F2F5F9',
  },
  reportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF3F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  },
});
