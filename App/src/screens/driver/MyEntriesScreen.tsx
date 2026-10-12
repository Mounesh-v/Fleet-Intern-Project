
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Screen,
  Card,
  SectionTitle,
  EmptyState,
  Field,
} from '../../components/UI';

const COLORS = {
  background: '#F7F3EB',
  surface: '#FFFDFA',
  primary: '#182A38',
  accent: '#F5BD32',
  text: '#252D35',
  secondary: '#777C83',
  muted: '#A0A4AA',
  border: '#E5DDD0',
  softYellow: '#FFF0C2',
  softBeige: '#F0E8DA',
};

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

export default function MyEntriesScreen({ t, session, entries }) {
  const [dateFilter, setDateFilter] = useState('');
  const [openId, setOpenId] = useState(null);

  const allEntries = Array.isArray(entries) ? entries : [];

  // Display only records belonging to the current driver.
  const ownEntries = allEntries.filter(
    entry => entry.driverId === session?.driverId,
  );

  const filterDate = normalizeDate(dateFilter);

  const rows = ownEntries
    .filter(entry => {
      if (!filterDate) return true;

      return (
        normalizeDate(entry.date) === filterDate ||
        normalizeDate(entry.dateDisplay) === filterDate
      );
    })
    .map((entry, index) => ({
      ...entry,
      id: entry.id || `entry-${index}`,
      customer: entry.customer || t('customer', 'Customer'),
      vehicle: entry.vehicle || t('vehicle', 'Vehicle'),
      location: entry.location || t('location', 'Location'),
      date: entry.date || t('unknownDate', 'Date unavailable'),
      work: entry.hours
        ? `${entry.hours} ${t('hours', 'hours')}`
        : entry.loads
        ? `${entry.loads} ${t('loads', 'loads')}`
        : t('workRecorded', 'Work recorded'),
    }));

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* Page heading */}
        <View style={styles.pageHeader}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>
              {t('driverPortal', 'DRIVER PORTAL')}
            </Text>

            <Text style={styles.heading}>
              {t('myEntries', 'My Entries')}
            </Text>

            <Text style={styles.subtitle}>
              {t('entriesSubtitle', 'Review your recorded work.')}
            </Text>
          </View>

          <View style={styles.headingIcon}>
            <Ionicons
              name="receipt-outline"
              size={25}
              color={COLORS.primary}
            />
          </View>
        </View>

        {/* Record count */}
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="documents-outline"
              size={21}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              {rows.length} {t('records', 'records')}
            </Text>
            <Text style={styles.summarySubtitle}>
              {t('yourWorkHistory', 'Your work history')}
            </Text>
          </View>
        </View>

        {/* Date filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionLabel}>
            {t('filterByDate', 'Filter by date')}
          </Text>

          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Field
                label=""
                value={dateFilter}
                onChangeText={setDateFilter}
                placeholder={t('datePlaceholder', 'DD/MM/YYYY')}
              />
            </View>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setDateFilter('')}
              accessibilityRole="button"
            >
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.clearText}>
                {t('allEntries', 'All')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Entries list */}
        <View style={styles.listHeader}>
          <SectionTitle
            title={t('workHistory', 'Work history')}
          />

          <Text style={styles.countText}>
            {rows.length}
          </Text>
        </View>

        {rows.length > 0 ? (
          rows.map(entry => {
            const expanded = openId === entry.id;
            const isJcb = String(entry.vehicle)
              .toLowerCase()
              .includes('jcb');

            return (
              <TouchableOpacity
                key={entry.id}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() =>
                  setOpenId(expanded ? null : entry.id)
                }
              >
                <Card style={styles.entryCard}>
                  {/* Entry heading */}
                  <View style={styles.entryTop}>
                    <View style={styles.vehicleIcon}>
                      <Ionicons
                        name={
                          isJcb
                            ? 'construct-outline'
                            : 'car-outline'
                        }
                        size={23}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.entryCopy}>
                      <Text style={styles.customer}>
                        {entry.customer}
                      </Text>

                      <Text style={styles.vehicle}>
                        {entry.vehicle}
                      </Text>
                    </View>

                    <View style={styles.status}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>
                        {t('recorded', 'Saved')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Work information */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoBlock}>
                      <Ionicons
                        name="location-outline"
                        size={15}
                        color={COLORS.secondary}
                      />
                      <Text
                        style={styles.infoText}
                        numberOfLines={2}
                      >
                        {entry.location}
                      </Text>
                    </View>

                    <View style={styles.workPill}>
                      <Text style={styles.workText}>
                        {entry.work}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={COLORS.secondary}
                    />

                    <Text style={styles.dateText}>
                      {entry.date}
                      {entry.time ? ` · ${entry.time}` : ''}
                    </Text>

                    <Ionicons
                      name={
                        expanded
                          ? 'chevron-up-outline'
                          : 'chevron-down-outline'
                      }
                      size={17}
                      color={COLORS.secondary}
                    />
                  </View>

                  {/* Expandable details */}
                  {expanded && (
                    <View style={styles.details}>
                      <Text style={styles.detailsHeading}>
                        {t('details', 'Entry details')}
                      </Text>

                      <Detail
                        label={t('mobile', 'Mobile')}
                        value={entry.mobile}
                      />

                      <Detail
                        label={t('material', 'Material')}
                        value={entry.material}
                      />

                      <Detail
                        label={t('quarry', 'Quarry')}
                        value={entry.quarry}
                      />

                      {(entry.dieselAmount != null &&
                        entry.dieselAmount !== '') && (
                        <Detail
                          label={t('dieselAmount', 'Diesel amount')}
                          value={`₹${entry.dieselAmount}${
                            entry.dieselLitres
                              ? ` · ${entry.dieselLitres} L`
                              : ''
                          }`}
                        />
                      )}

                      {(entry.otherExpenses != null &&
                        entry.otherExpenses !== '') && (
                        <Detail
                          label={t('otherExpenses', 'Other expenses')}
                          value={`₹${entry.otherExpenses}${
                            entry.expenseCategory
                              ? ` · ${entry.expenseCategory}`
                              : ''
                          }`}
                        />
                      )}

                      <Detail
                        label={t('description', 'Description')}
                        value={entry.expenseDescription}
                      />

                      <Detail
                        label={t('notes', 'Notes')}
                        value={entry.notes}
                      />
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <EmptyState
              title={t('noEntries', 'No work entries found')}
              subtitle={t(
                'noEntriesSubtitle',
                'Your saved work records will appear here.',
              )}
            />
          </View>
        )}

        <Text style={styles.privacyNote}>
          <Ionicons
            name="lock-closed-outline"
            size={12}
            color={COLORS.muted}
          />{' '}
          {t('driverOnly', 'Only your work records are shown here.')}
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

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 28,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headingCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#9A6A00',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 7,
  },
  heading: {
    color: COLORS.primary,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 12,
    marginTop: 5,
  },
  headingIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: COLORS.softYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    marginBottom: 24,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  summarySubtitle: {
    color: '#D4DCE3',
    fontSize: 11,
    marginTop: 3,
  },

  filterSection: {
    marginBottom: 22,
  },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  filterField: {
    flex: 1,
  },
  clearButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  clearText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
  },

  entryCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 13,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.softBeige,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  entryCopy: {
    flex: 1,
  },
  customer: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  vehicle: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5EFD9',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B78716',
  },
  statusText: {
    color: '#7C5A0A',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: 11,
  },
  workPill: {
    backgroundColor: COLORS.softYellow,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  workText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dateText: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: 11,
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
