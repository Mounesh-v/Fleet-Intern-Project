// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Screen,
  Card,
  Badge,
  SectionTitle,
  EmptyState,
  Loading,
  PrimaryButton,
} from '../../components/UI';
import { useCustomAlert } from '../../components/CustomAlert';
import { C, S, R, T } from '../../themeCompat';
import {
  fetchDashboard,
  formatMoney,
  formatDay,
  typeLabel,
  entryQuantity,
} from '../../services/adminService';
import { useAuth } from '../../features/auth/context/authContext';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const shortDay = value => {
  const str = String(value || '');
  const parts = str.slice(0, 10).split('-');
  if (parts.length === 3) {
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    );
    return `${DAY_ABBR[d.getDay()]} · ${formatDay(value)}`;
  }
  return formatDay(value);
};

/**
 * AdminDashboardScreen — navy header (greeting, attention, today's
 * work), financial snapshot, quick actions into the real create
 * flows, 7-day operational performance, and recent entries. All
 * figures come live from GET /api/admin/dashboard.
 */
export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { alert, alertNode } = useCustomAlert();

  const load = useCallback(async () => {
    try {
      const data = await fetchDashboard();
      setStats(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load dashboard.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (!stats && !error) {
    return <Loading label="Loading dashboard…" />;
  }

  if (error && !stats) {
    return (
      <Screen style={styles.center}>
        <EmptyState title="Could not load dashboard" subtitle={error} />
        <View style={styles.retry}>
          <PrimaryButton title="Retry" onPress={load} />
        </View>
      </Screen>
    );
  }

  const t = stats.totals;
  const series = stats.series || [];
  const recent = stats.recentEntries || [];
  const maxIncome = Math.max(1, ...series.map(d => d.income || 0));
  const maxExpense = Math.max(1, ...series.map(d => d.expense || 0));

  const net = (t.totalBilled || 0) - (t.totalExpenses || 0);
  const marginPct =
    t.totalBilled > 0 ? Math.round((net / t.totalBilled) * 100) : null;
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.username || 'Admin';
  const displayNameCap =
    displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const initials = displayName.slice(0, 2).toUpperCase();
  const dateLabel = `${DAY_ABBR[now.getDay()]}, ${now.getDate()} ${
    MONTHS[now.getMonth()]
  } ${now.getFullYear()}`;

  const showNotifications = () => {
    const pending = recent.filter(item => item.status === 'SUBMITTED').length;
    const lines = [
      t.outstanding > 0
        ? `${formatMoney(t.outstanding)} credit outstanding.`
        : 'No outstanding credit.',
      pending > 0
        ? `${pending} recent ${
            pending === 1 ? 'entry needs' : 'entries need'
          } verification.`
        : 'All recent entries are verified.',
      `${t.todayEntries} ${
        t.todayEntries === 1 ? 'entry' : 'entries'
      } logged today.`,
    ];
    alert('Notifications', lines.join('\n'), { type: 'info' });
  };

  return (
    <Screen>
      {/* Navy header — sits outside the ScrollView so it spans the full
          screen width (ScrollView clips the negative-margin overflow). */}
      <View
        style={[styles.header, { paddingTop: insets.top + S.md + 6 }]}
      >
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <View style={styles.blobC} />

        <View style={styles.headRow}>
          <View style={styles.headLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.adminName}>{displayNameCap}</Text>
            <Text style={styles.headDate}>{dateLabel}</Text>
          </View>
          <View style={styles.headRight}>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.7}
              onPress={showNotifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons
                name="notifications-outline"
                size={19}
                color={C.white}
              />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headStats}>
          <HeadStat
            icon="today-outline"
            label="Today's work"
            value={`${t.todayEntries} ${
              t.todayEntries === 1 ? 'entry' : 'entries'
            }`}
          />
          <View style={styles.headDivider} />
          <HeadStat
            icon="car-sport-outline"
            label="Active vehicles"
            value={`${t.activeVehicles} of ${t.vehicles}`}
          />
          <View style={styles.headDivider} />
          <HeadStat
            icon={
              t.outstanding > 0
                ? 'alert-circle-outline'
                : 'checkmark-circle-outline'
            }
            label="Attention"
            value={t.outstanding > 0 ? formatMoney(t.outstanding) : 'All clear'}
            valueColor={t.outstanding > 0 ? C.accent : '#16845B'}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Financial snapshot */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Financial snapshot</Text>
          <Text style={styles.sectionMeta}>
            {formatDay(stats.range?.from)} – {formatDay(stats.range?.to)}
          </Text>
        </View>
        <View style={styles.snapGrid}>
          <SnapshotCard
            icon="cash-outline"
            tone="green"
            label="Revenue"
            value={formatMoney(t.totalBilled)}
            hint="Billed this period"
          />
          <SnapshotCard
            icon="remove-circle-outline"
            tone="red"
            label="Expenses"
            value={formatMoney(t.totalExpenses)}
            hint="Diesel + overheads"
          />
          <SnapshotCard
            icon="analytics-outline"
            tone={net >= 0 ? 'green' : 'red'}
            label="Net profit"
            value={formatMoney(net)}
            hint={
              marginPct !== null
                ? `${marginPct}% of revenue`
                : 'Revenue − expenses'
            }
          />
          <SnapshotCard
            icon="alert-circle-outline"
            tone={t.outstanding > 0 ? 'red' : 'green'}
            label="Credit due"
            value={formatMoney(t.outstanding)}
            hint={
              t.outstanding > 0
                ? 'Unpaid from customers'
                : 'Nothing outstanding'
            }
          />
        </View>

        {/* Quick actions */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickRow}>
          <QuickAction
            icon="create-outline"
            label="Add work"
            onPress={() => navigation.navigate('Work', { openAdd: true })}
          />
          <QuickAction
            icon="cash-outline"
            label="Add expense"
            onPress={() => navigation.navigate('Finance', { open: 'expense' })}
          />
          <QuickAction
            icon="document-text-outline"
            label="Create bill"
            onPress={() => navigation.navigate('Work')}
          />
          <QuickAction
            icon="wallet-outline"
            label="Payment"
            onPress={() => navigation.navigate('Finance', { open: 'payment' })}
          />
        </View>

        {/* Operational performance */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Operational performance</Text>
          <Text style={styles.sectionMeta}>Last 7 days</Text>
        </View>
        <Card>
          {series.length === 0 ? (
            <Text style={styles.muted}>No activity in this period.</Text>
          ) : (
            series.map(day => {
              const income = day.income || 0;
              const expense = day.expense || 0;
              const dayNet = income - expense;
              return (
                <View key={day.date} style={styles.dayBlock}>
                  <View style={styles.dayHead}>
                    <Text style={styles.dayDate}>{shortDay(day.date)}</Text>
                    <Text
                      style={[
                        styles.dayNet,
                        { color: dayNet >= 0 ? C.success : C.danger },
                      ]}
                    >
                      {dayNet >= 0 ? '+' : '−'}
                      {formatMoney(Math.abs(dayNet))}
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Revenue</Text>
                    <View style={styles.metricTrack}>
                      <View
                        style={[
                          styles.metricFill,
                          {
                            width: `${Math.round((income / maxIncome) * 100)}%`,
                            backgroundColor: C.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.metricValue, { color: C.success }]}>
                      {formatMoney(income)}
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Expense</Text>
                    <View style={styles.metricTrack}>
                      <View
                        style={[
                          styles.metricFill,
                          {
                            width: `${Math.round(
                              (expense / maxExpense) * 100,
                            )}%`,
                            backgroundColor: C.danger,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.metricValue, { color: C.danger }]}>
                      {formatMoney(expense)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Recent entries */}
        <SectionTitle title="Recent work entries" />
        {recent.length === 0 ? (
          <Card>
            <EmptyState
              title="No entries yet"
              subtitle="Work entries will appear here."
            />
          </Card>
        ) : (
          recent.map(entry => (
            <Card key={entry._id} style={styles.entryCard}>
              <View style={styles.entryTop}>
                <Text style={styles.entryVehicle}>
                  {entry.vehicle?.registrationNo || '—'} ·{' '}
                  {typeLabel(entry.type)}
                </Text>
                <StatusPill status={entry.status} />
              </View>
              <Text style={styles.entryDriver}>
                {entry.driver?.name || '—'} · {entryQuantity(entry)}
                {entry.customer?.name ? ` · ${entry.customer.name}` : ''}
              </Text>
              <Text style={styles.entryAmount}>
                {formatMoney(entry.billedAmount)}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
      {alertNode}
    </Screen>
  );
}

function HeadStat({ icon, label, value, valueColor = C.white }) {
  const iconColor =
    valueColor === C.white ? 'rgba(255,255,255,0.7)' : valueColor;
  return (
    <View style={styles.headStat}>
      <Ionicons name={icon} size={14} color={iconColor} />
      <Text
        style={[styles.headStatValue, { color: valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.headStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SnapshotCard({ icon, tone, label, value, hint }) {
  const color =
    tone === 'red' ? C.danger : tone === 'amber' ? C.warning : C.success;
  const bg =
    tone === 'red' ? C.softRed : tone === 'amber' ? C.softOrange : C.softGreen;
  return (
    <View style={styles.snapCell}>
      <View style={styles.snapBox}>
        <View style={[styles.snapIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={17} color={color} />
        </View>
        <Text style={styles.snapValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={styles.snapLabel}>{label}</Text>
        <Text style={styles.snapHint} numberOfLines={1}>
          {hint}
        </Text>
      </View>
    </View>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.quickCard}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={C.primary} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatusPill({ status }) {
  const tone =
    status === 'LOCKED' ? 'blue' : status === 'VERIFIED' ? 'green' : 'orange';
  const label = status
    ? status.charAt(0) + status.slice(1).toLowerCase()
    : 'Draft';
  return <Badge label={label} tone={tone} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: S.lg, alignSelf: 'stretch' },
  content: { paddingBottom: S.xxl },

  // Navy header
  header: {
    marginHorizontal: -S.lg, // full-bleed — cancels Screen's side padding
    marginTop: -S.md, // navy reaches the top of the content area
    paddingHorizontal: S.lg, // header content aligns with the sections below
    paddingBottom: S.xl,
    backgroundColor: C.primary,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  blobA: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 185, 35, 0.16)',
    top: -84,
    right: -56,
  },
  blobB: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -70,
    left: -40,
  },
  blobC: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 185, 35, 0.12)',
    bottom: 26,
    right: -16,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headLeft: { flex: 1, paddingRight: S.md },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.72)',
  },
  adminName: {
    fontSize: 25,
    fontWeight: '800',
    color: C.white,
    marginTop: 3,
    letterSpacing: -0.4,
  },
  headDate: { fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 4 },
  headRight: { flexDirection: 'row', alignItems: 'center' },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.sm + 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.primary },
  headStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: S.md + 2,
    paddingHorizontal: S.sm + 4,
    marginTop: S.lg + 4,
  },
  headStat: { flex: 1, alignItems: 'flex-start', paddingHorizontal: 2 },
  headStatValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  headStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.62)', marginTop: 2 },
  headDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginHorizontal: S.sm,
  },

  // Sections
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: S.lg,
    marginBottom: S.md,
  },
  sectionTitle: { ...T.title, color: C.textPrimary },
  sectionMeta: { fontSize: 11, fontWeight: '700', color: C.textMuted },

  // Financial snapshot
  snapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -S.xs,
  },
  snapCell: { width: '50%', paddingHorizontal: S.xs, paddingBottom: S.sm },
  snapBox: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: S.md,
    minHeight: 116,
  },
  snapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapValue: {
    fontSize: 19,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: S.sm,
    letterSpacing: -0.4,
  },
  snapLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSecondary,
    marginTop: 2,
  },
  snapHint: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: S.sm },
  quickCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    alignItems: 'center',
    paddingVertical: S.md,
    paddingHorizontal: 4,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.sm,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
  },

  // Operational performance
  muted: { fontSize: 13, color: C.textMuted },
  dayBlock: {
    paddingVertical: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayDate: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  dayNet: { fontSize: 12, fontWeight: '800' },
  metricRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    width: 52,
  },
  metricTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(16, 26, 37, 0.08)',
    marginHorizontal: S.sm,
    overflow: 'hidden',
  },
  metricFill: { height: 6, borderRadius: 3 },
  metricValue: {
    fontSize: 11,
    fontWeight: '700',
    width: 78,
    textAlign: 'right',
  },

  // Recent entries
  entryCard: { paddingVertical: S.md, marginBottom: S.sm },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryVehicle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    flex: 1,
  },
  entryDriver: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
  entryAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: C.primary,
    marginTop: 6,
    letterSpacing: -0.3,
  },
});
