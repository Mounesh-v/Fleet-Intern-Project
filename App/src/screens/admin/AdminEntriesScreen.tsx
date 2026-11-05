// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Screen,
  Card,
  Chip,
  Badge,
  SectionTitle,
  EmptyState,
  Loading,
} from '../../components/UI';
import { C, S, T } from '../../themeCompat';
import {
  fetchWorkEntries,
  setWorkEntryStatus,
  formatMoney,
  formatDay,
  typeLabel,
  entryQuantity,
} from '../../services/adminService';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'LOCKED', label: 'Locked' },
];

/**
 * AdminEntriesScreen — all work entries with status filters and
 * one-tap status transitions (verify / lock / reopen) via Alert.
 */
export default function AdminEntriesScreen() {
  const [filter, setFilter] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const changeStatus = (entry, status) => {
    const labels = { VERIFIED: 'Verify', LOCKED: 'Lock', SUBMITTED: 'Reopen' };
    Alert.alert(
      `${labels[status]} entry`,
      `${entry.vehicle?.registrationNo || 'Entry'} · ${formatDay(entry.date)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: labels[status],
          onPress: async () => {
            try {
              await setWorkEntryStatus(entry._id, status);
              load();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const openActions = entry => {
    const buttons = [{ text: 'Cancel', style: 'cancel' }];
    if (entry.status === 'SUBMITTED') {
      buttons.push({ text: 'Verify', onPress: () => changeStatus(entry, 'VERIFIED') });
      buttons.push({ text: 'Lock', onPress: () => changeStatus(entry, 'LOCKED') });
    } else if (entry.status === 'VERIFIED') {
      buttons.push({ text: 'Lock', onPress: () => changeStatus(entry, 'LOCKED') });
      buttons.push({ text: 'Reopen', onPress: () => changeStatus(entry, 'SUBMITTED') });
    } else {
      buttons.push({ text: 'Reopen', onPress: () => changeStatus(entry, 'SUBMITTED') });
    }
    Alert.alert(
      `${entry.vehicle?.registrationNo || 'Work entry'} · ${entryQuantity(entry)}`,
      `${entry.driver?.name || '—'} · ${formatMoney(entry.billedAmount)}`,
      buttons,
    );
  };

  if (loading) {
    return <Loading label="Loading entries…" />;
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OPERATIONS</Text>
          <Text style={styles.title}>Work entries</Text>
        </View>

        {/* Status filter chips */}
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

        <SectionTitle title={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} />

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              title="No entries here"
              subtitle="Drivers' submissions will appear for verification."
            />
          </Card>
        ) : (
          entries.map(entry => (
            <TouchableOpacity key={entry._id} activeOpacity={0.7} onPress={() => openActions(entry)}>
              <Card style={styles.entryCard}>
                <View style={styles.entryTop}>
                  <Text style={styles.entryDate}>{formatDay(entry.date)}</Text>
                  <StatusPill status={entry.status} />
                </View>
                <Text style={styles.entryTitle}>
                  {entry.vehicle?.registrationNo || '—'} · {typeLabel(entry.type)} ·{' '}
                  {entryQuantity(entry)}
                </Text>
                <Text style={styles.entrySub}>
                  {entry.driver?.name || '—'}
                  {entry.customer?.name ? ` · ${entry.customer.name}` : ''}
                  {entry.material?.name ? ` · ${entry.material.name}` : ''}
                </Text>
                <View style={styles.entryBottom}>
                  <Text style={styles.entryAmount}>{formatMoney(entry.billedAmount)}</Text>
                  {entry.status !== 'LOCKED' ? (
                    <Text style={styles.entryAction}>Tap for actions ›</Text>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
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
  content: { paddingBottom: S.xxl },
  header: { marginBottom: S.md },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.accentDark },
  title: { ...T.heading, color: C.primary, marginTop: 4, letterSpacing: -0.6 },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
    marginBottom: S.md,
  },
  entryCard: { paddingVertical: S.md, marginBottom: S.sm },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
  entryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: 6,
  },
  entrySub: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  entryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  entryAmount: { fontSize: 15, fontWeight: '800', color: C.primary },
  entryAction: { fontSize: 11, fontWeight: '700', color: C.accentDark },
  errorCard: { borderColor: C.danger, marginBottom: S.sm },
  errorText: { fontSize: 13, color: C.danger, fontWeight: '600' },
});
