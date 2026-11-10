
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Screen,
  Card,
  EmptyState,
  Field,
} from '../../components/UI';
import { typeLabel } from '../../services/adminService';

const COLORS = {
  background: '#F3F5F8',
  surface: '#FFFFFF',
  primary: '#182F50',
  accent: '#F5B923',
  text: '#182B45',
  secondary: '#8B9AAF',
  muted: '#8B9AAF',
  border: '#E6EBF1',
  softYellow: '#FFF6DE',
  softBeige: '#EEF3F9',
};

const MONTH_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

const FILTERS = [
  { key: 'week', label: 'This week' },
  { key: 'last', label: 'Last week' },
  { key: 'custom', label: 'Custom dates' },
];

// Accepts DD/MM/YYYY, D/M/YYYY and ISO YYYY-MM-DD, ignoring leading zeros.
function normalizeDate(value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${Number(iso[3])}/${Number(iso[2])}/${iso[1]}`;
  }

  const slashed = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashed) {
    return `${Number(slashed[1])}/${Number(slashed[2])}/${slashed[3]}`;
  }

  return raw;
}

function parseDate(value) {
  const norm = normalizeDate(value);
  const parts = norm.split('/');
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Sunday-start week window for the given week offset (0 = current week).
function weekBounds(offset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - day + offset * 7);
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 6,
  );
  return [start, end];
}

function dayMonth(value) {
  const parts = normalizeDate(value).split('/');
  if (parts.length !== 3) return { day: '--', month: '' };
  const m = Number(parts[1]) - 1;
  return {
    day: String(Number(parts[0])).padStart(2, '0'),
    month: MONTH_SHORT[m] || '',
  };
}

function todayNormalized() {
  const n = new Date();
  const iso = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(n.getDate()).padStart(2, '0')}`;
  return normalizeDate(iso);
}

export default function MyEntriesScreen({ session, entries }) {
  const [dateFilter, setDateFilter] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('');
  const [openId, setOpenId] = useState(null);

  const allEntries = Array.isArray(entries) ? entries : [];

  // Display only records belonging to the current driver.
  const ownEntries = allEntries.filter(
    entry => entry.driverId === session?.driverId,
  );

  const searchQ = search.trim().toLowerCase();
  const customFrom = parseDate(dateFilter);
  const customTo = parseDate(dateTo);
  const [weekStart, weekEnd] = weekBounds(0);
  const [lastStart, lastEnd] = weekBounds(-1);

  const rows = ownEntries
    .filter(entry => {
      if (searchQ) {
        const hay = `${entry.customer || ''} ${
          entry.vehicle || ''
        }`.toLowerCase();
        if (!hay.includes(searchQ)) return false;
      }

      if (range === 'week' || range === 'last') {
        const s = range === 'week' ? weekStart : lastStart;
        const e = range === 'week' ? weekEnd : lastEnd;
        const d = parseDate(entry.dateISO || entry.dateDisplay || entry.date);
        if (!d || d < s || d > e) return false;
      } else if (range === 'custom') {
        const d = parseDate(entry.dateISO || entry.dateDisplay || entry.date);
        if (customFrom && (!d || d < customFrom)) return false;
        if (customTo && (!d || d > customTo)) return false;
      }

      return true;
    })
    .map((entry, index) => ({
      ...entry,
      id: entry.id || `entry-${index}`,
      customer: entry.customer || 'Customer',
      vehicle: entry.vehicle || 'Vehicle',
      location: entry.location || 'Location',
      date: entry.date || 'Date unavailable',
      work:
        entry.type === 'JCB' && entry.hours
          ? `${entry.hours} hours`
          : entry.type === 'TIPPER' && entry.loads
          ? `${entry.loads} loads`
          : entry.type === 'TATA_ACE' && entry.loads
          ? `${entry.loads} trips`
          : 'Work recorded',
    }));

  const totalEntries = rows.length;
  const totalHours = rows.reduce(
    (sum, entry) => sum + (Number(entry.hours) || 0),
    0,
  );
  const hoursDisplay = Number.isInteger(totalHours)
    ? String(totalHours)
    : totalHours.toFixed(1);

  return (
    <Screen style={styles.screen}>
      {/* White rounded header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Work History</Text>
        <Text style={styles.headerSub}>Track your submitted work.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* Search row */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by customer name or vehicle registration"
            placeholderTextColor="#A9A49B"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search work history"
          />
          <TouchableOpacity
            style={styles.calBtn}
            onPress={() => setRange('custom')}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Custom date filter"
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <View style={styles.chipsRow}>
          {FILTERS.map(f => {
            const on = range === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setRange(on ? '' : f.key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom date range */}
        {range === 'custom' ? (
          <View style={styles.customRow}>
            <View style={styles.customField}>
              <Field
                label="From"
                value={dateFilter}
                onChangeText={setDateFilter}
                placeholder="DD/MM/YYYY"
              />
            </View>
            <View style={styles.customField}>
              <Field
                label="To"
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="DD/MM/YYYY"
              />
            </View>
          </View>
        ) : null}

        {/* Summary card */}
        <View style={styles.summary}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryValue}>{totalEntries}</Text>
            <Text style={styles.summaryLabel}>Total entries</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryValue}>{hoursDisplay}</Text>
            <Text style={styles.summaryLabel}>Total work hours</Text>
          </View>
        </View>

        {/* Entries list */}
        {rows.length > 0 ? (
          rows.map(entry => {
            const expanded = openId === entry.id;
            const tone = statusTone(entry.status);
            const entryDate = entry.dateISO || entry.dateDisplay || entry.date;
            const dm = dayMonth(entryDate);
            const editToday =
              normalizeDate(entryDate) === todayNormalized() &&
              entry.status !== 'VERIFIED' &&
              entry.status !== 'LOCKED';

            const workParts = [typeLabel(entry.type)];
            if (entry.material) workParts.push(entry.material);
            if (
              entry.type !== 'JCB' &&
              entry.work &&
              entry.work !== 'Work recorded'
            ) {
              workParts.push(entry.work);
            }
            const workLine = workParts.join(' · ');

            return (
              <TouchableOpacity
                key={entry.id}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpenId(expanded ? null : entry.id)}
              >
                <Card style={styles.entryCard}>
                  <View style={styles.entryMain}>
                    {/* Timeline date column */}
                    <View style={styles.dateCol}>
                      <View style={styles.dateDay}>
                        <Text style={styles.dateDayText}>{dm.day}</Text>
                      </View>
                      <Text style={styles.dateMonth}>{dm.month}</Text>
                      <View style={styles.timelineLine} />
                    </View>

                    {/* Entry content */}
                    <View style={styles.entryBody}>
                      <View style={styles.titleRow}>
                        <Text style={styles.customer} numberOfLines={1}>
                          {entry.customer}
                        </Text>
                        <View
                          style={[
                            styles.status,
                            { backgroundColor: tone.bg },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: tone.dot },
                            ]}
                          />
                          <Text
                            style={[styles.statusText, { color: tone.text }]}
                          >
                            {statusLabel(entry.status)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.meta} numberOfLines={1}>
                        {entry.vehicle}
                        {entry.hours ? ` · ${entry.hours} hours` : ''}
                      </Text>

                      <View style={styles.metaRow}>
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color={COLORS.secondary}
                        />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {entry.location}
                        </Text>
                      </View>

                      <View style={styles.bottomRow}>
                        <View style={styles.typePill}>
                          <Text style={styles.typePillText} numberOfLines={1}>
                            {workLine}
                          </Text>
                        </View>
                        <View style={styles.bottomRight}>
                          {editToday ? (
                            <View style={styles.editPill}>
                              <Text style={styles.editPillText}>
                                Edit Today
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.noEdit}>No editing</Text>
                          )}
                          <Ionicons
                            name={
                              expanded
                                ? 'chevron-down'
                                : 'chevron-forward'
                            }
                            size={16}
                            color={COLORS.secondary}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Expandable details */}
                  {expanded && (
                    <View style={styles.details}>
                      <Text style={styles.detailsHeading}>
                        Entry details
                      </Text>

                      <Detail label="Mobile" value={entry.mobile} />

                      <Detail label="Material" value={entry.material} />

                      <Detail label="Quarry" value={entry.quarry} />

                      {entry.dieselAmount != null &&
                        entry.dieselAmount !== '' && (
                          <Detail
                            label="Diesel amount"
                            value={`₹${entry.dieselAmount}${
                              entry.dieselLitres
                                ? ` · ${entry.dieselLitres} L`
                                : ''
                            }`}
                          />
                        )}

                      {entry.otherExpenses != null &&
                        entry.otherExpenses !== '' && (
                          <Detail
                            label="Other expenses"
                            value={`₹${entry.otherExpenses}${
                              entry.expenseCategory
                                ? ` · ${entry.expenseCategory}`
                                : ''
                            }`}
                          />
                        )}

                      <Detail
                        label="Description"
                        value={entry.expenseDescription}
                      />

                      <Detail label="Notes" value={entry.notes} />
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No work entries found"
              subtitle="Your saved work records will appear here."
            />
          </View>
        )}

        <Text style={styles.privacyNote}>
          <Ionicons
            name="lock-closed-outline"
            size={12}
            color={COLORS.muted}
          />          {' '}
          Only your work records are shown here.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Detail({ label, value }) {
  if (value == null || value === '') return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
}

/** Real work-entry lifecycle status → pill label. */
function statusLabel(status) {
  if (status === 'VERIFIED') return 'Verified';
  if (status === 'LOCKED') return 'Locked';
  if (status === 'SUBMITTED') return 'Submitted';
  return 'Saved';
}

function statusTone(status) {
  if (status === 'VERIFIED') return { bg: 'rgba(22,132,91,0.12)', dot: '#16845B', text: '#16845B' };
  if (status === 'LOCKED') return { bg: '#EEF1F6', dot: '#8B9AAF', text: '#8B9AAF' };
  if (status === 'SUBMITTED') return { bg: 'rgba(245,185,35,0.16)', dot: '#B4770B', text: '#B4770B' };
  return { bg: '#EAF2F8', dot: '#172F50', text: '#172F50' };
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 14,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 21,
    fontWeight: '800',
  },
  headerSub: {
    color: COLORS.secondary,
    fontSize: 12.5,
    marginTop: 5,
  },

  scroll: {
    paddingBottom: 30,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    padding: 0,
  },
  calBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.softBeige,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextOn: {
    color: COLORS.primary,
  },

  customRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  customField: {
    flex: 1,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#D4DCE3',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
  },

  entryCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  entryMain: {
    flexDirection: 'row',
  },
  dateCol: {
    width: 44,
    alignItems: 'center',
    paddingRight: 10,
  },
  dateDay: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.softYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDayText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  dateMonth: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 6,
    backgroundColor: COLORS.border,
  },

  entryBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customer: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 14.5,
    fontWeight: '800',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  meta: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  metaText: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: 11.5,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  typePill: {
    flexShrink: 1,
    backgroundColor: COLORS.softBeige,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    maxWidth: '62%',
  },
  typePillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  editPill: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  editPillText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  noEdit: {
    color: COLORS.secondary,
    fontSize: 10.5,
    fontWeight: '600',
  },

  details: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailsHeading: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  detailLabel: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: 11,
  },
  detailValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },

  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 8,
  },
  privacyNote: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 16,
  },
});
