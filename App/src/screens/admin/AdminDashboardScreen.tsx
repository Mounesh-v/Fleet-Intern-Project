// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Screen, Card, StatCard, Badge, SectionTitle, EmptyState, Loading, PrimaryButton } from '../../components/UI';
import { C, S, T } from '../../themeCompat';
import {
  fetchDashboard,
  formatMoney,
  formatDay,
  typeLabel,
  entryQuantity,
} from '../../services/adminService';

/**
 * AdminDashboardScreen — fleet KPIs, 7-day income/expense series,
 * and recent work entries, all live from GET /api/admin/dashboard.
 */
export default function AdminDashboardScreen() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
  const maxDay = Math.max(1, ...series.map(d => d.income || 0));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ADMIN WORKSPACE</Text>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            {formatDay(stats.range?.from)} – {formatDay(stats.range?.to)} · demo data
          </Text>
        </View>

        {/* KPI grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <StatCard label="Vehicles" value={`${t.activeVehicles}/${t.vehicles}`} hint="active / total" tone="blue" icon="JCB" />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Today's entries" value={String(t.todayEntries)} hint="work logged" tone="green" icon="✓" />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Income (period)" value={formatMoney(t.totalBilled)} hint="billed total" tone="green" icon="₹" />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Expenses (period)" value={formatMoney(t.totalExpenses)} hint="diesel + overheads" tone="red" icon="↓" />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Outstanding" value={formatMoney(t.outstanding)} hint="unpaid credit" tone="orange" icon="!" />
          </View>
          <View style={styles.gridItem}>
            <StatCard label="Drivers" value={`${t.activeDrivers}/${t.drivers}`} hint="active / total" tone="blue" icon="D" />
          </View>
        </View>

        {/* 7-day series */}
        <SectionTitle title="Last 7 days" />
        <Card>
          {series.length === 0 ? (
            <Text style={styles.muted}>No activity in this period.</Text>
          ) : (
            series.map(day => (
              <View key={day.date} style={styles.dayRow}>
                <View style={styles.dayLeft}>
                  <Text style={styles.dayDate}>{formatDay(day.date)}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.round(((day.income || 0) / maxDay) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.dayRight}>
                  <Text style={styles.dayIncome}>{formatMoney(day.income)}</Text>
                  <Text style={styles.dayExpense}>−{formatMoney(day.expense)}</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Recent entries */}
        <SectionTitle title="Recent work entries" />
        {recent.length === 0 ? (
          <Card>
            <EmptyState title="No entries yet" subtitle="Work entries will appear here." />
          </Card>
        ) : (
          recent.map(entry => (
            <Card key={entry._id} style={styles.entryCard}>
              <View style={styles.entryTop}>
                <Text style={styles.entryVehicle}>
                  {entry.vehicle?.registrationNo || '—'} · {typeLabel(entry.type)}
                </Text>
                <StatusPill status={entry.status} />
              </View>
              <Text style={styles.entryDriver}>
                {entry.driver?.name || '—'} · {entryQuantity(entry)}
                {entry.customer?.name ? ` · ${entry.customer.name}` : ''}
              </Text>
              <Text style={styles.entryAmount}>{formatMoney(entry.billedAmount)}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function StatusPill({ status }) {
  const tone =
    status === 'LOCKED' ? 'blue' : status === 'VERIFIED' ? 'green' : 'orange';
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Draft';
  return <Badge label={label} tone={tone} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: S.lg, alignSelf: 'stretch' },
  content: { paddingBottom: S.xxl },
  header: { marginBottom: S.lg },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.accentDark,
  },
  title: {
    ...T.heading,
    color: C.primary,
    marginTop: 4,
    letterSpacing: -0.6,
  },
  subtitle: { marginTop: 4, fontSize: 13, color: C.textSecondary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -S.xs,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: S.xs,
    paddingBottom: S.sm,
  },
  muted: { fontSize: 13, color: C.textMuted },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  dayLeft: { flex: 1, paddingRight: S.md },
  dayDate: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.softOrange,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  dayRight: { alignItems: 'flex-end' },
  dayIncome: { fontSize: 13, fontWeight: '800', color: C.success },
  dayExpense: { fontSize: 11, color: C.danger, marginTop: 2 },
  entryCard: { paddingVertical: S.md },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryVehicle: { fontSize: 14, fontWeight: '800', color: C.textPrimary, flex: 1 },
  entryDriver: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
  entryAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: C.primary,
    marginTop: 6,
    letterSpacing: -0.3,
  },
});
