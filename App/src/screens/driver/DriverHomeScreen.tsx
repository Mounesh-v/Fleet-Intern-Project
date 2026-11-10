// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, EmptyState } from '../../components/UI';
import { useCustomAlert } from '../../components/CustomAlert';
import { typeLabel } from '../../services/adminService';

const NAVY = '#172F50';
const DARK = '#102744';
const YELLOW = '#F5B923';
const BG = '#F3F5F8';
const WHITE = '#FFFFFF';
const TEXT = '#182B45';
const MUTED = '#8B9AAF';
const GREEN = '#16845B';
const BORDER = '#E6EBF1';
const AMBER = '#B4770B';

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = value => String(value).padStart(2, '0');

const greetingFor = hour => {
  if (hour < 12) return 'Good Morning,';
  if (hour < 17) return 'Good Afternoon,';
  return 'Good Evening,';
};

const dateLine = () => {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const formatTime = value => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

const initialsOf = (name, username) => {
  const source = String(name || username || 'Driver').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'DR';
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

const titleCase = value =>
  value ? `${value.charAt(0)}${value.slice(1).toLowerCase()}` : '';

const statusLabel = status => {
  const s = String(status || '').toUpperCase();
  if (s === 'SUBMITTED') return 'Submitted';
  if (s === 'VERIFIED') return 'Verified';
  if (s === 'LOCKED') return 'Locked';
  return titleCase(String(status || ''));
};

const statusTone = status => {
  const s = String(status || '').toUpperCase();
  if (s === 'VERIFIED') return 'green';
  if (s === 'SUBMITTED') return 'amber';
  if (s === 'LOCKED') return 'grey';
  return 'navy';
};

const workLine = entry => {
  let qty = '';
  if (entry.type === 'JCB') {
    qty = entry.hours ? `${entry.hours} ${entry.hours === '1' ? 'Hour' : 'Hours'}` : '';
  } else if (entry.type === 'TATA_ACE') {
    qty = entry.loads ? `${entry.loads} ${entry.loads === '1' ? 'Trip' : 'Trips'}` : '';
  } else {
    qty = entry.loads ? `${entry.loads} ${entry.loads === '1' ? 'Load' : 'Loads'}` : '';
  }
  return [typeLabel(entry.type), qty].filter(Boolean).join(' · ');
};

function StatusBadge({ label, tone }) {
  const tones = {
    green: { bg: 'rgba(22,132,91,0.12)', fg: GREEN },
    amber: { bg: 'rgba(245,185,35,0.16)', fg: AMBER },
    grey: { bg: '#EEF1F6', fg: MUTED },
    navy: { bg: '#EAF2F8', fg: NAVY },
  };
  const t = tones[tone] || tones.grey;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * DriverHomeScreen — driver dashboard from the design spec: navy greeting
 * header, assigned vehicle card, quick actions and today's activity.
 * Data comes from the driver session + own work entries (context);
 * drivers never see amounts, rates or financial data here.
 */
export default function DriverHomeScreen({ navigation, session, entries }) {
  const insets = useSafeAreaInsets();
  const { alert, alertNode } = useCustomAlert();
  const [syncedAt] = useState(() => new Date());

  const vehicle = session?.vehicleInfo || null;
  const vehicleStatus = String(vehicle?.status || '').toUpperCase();

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayEntries = useMemo(() => {
    return (entries || [])
      .filter(entry => entry.dateISO === todayISO)
      .slice()
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }, [entries, todayISO]);

  const showNotifications = () => {
    alert('Notifications', 'No new notifications yet.', { type: 'info' });
  };

  const vehicleBadge = !vehicle
    ? null
    : vehicleStatus === 'ACTIVE'
      ? { label: 'Working', tone: 'green' }
      : vehicleStatus === 'MAINTENANCE'
        ? { label: 'Maintenance', tone: 'amber' }
        : { label: 'Inactive', tone: 'grey' };

  const vehicleModel = vehicle
    ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
      typeLabel(vehicle.type)
    : 'Contact your admin to get an assignment';

  const vehicleReadyLine = !vehicle
    ? 'No vehicle assigned'
    : vehicleStatus === 'ACTIVE'
      ? "Ready for today's work"
      : vehicleStatus === 'MAINTENANCE'
        ? 'Currently under maintenance'
        : 'Not available for work';

  const dotColor = !vehicle
    ? MUTED
    : vehicleStatus === 'ACTIVE'
      ? GREEN
      : vehicleStatus === 'MAINTENANCE'
        ? AMBER
        : MUTED;

  const count = todayEntries.length;
  const countLine = `${count} work ${count === 1 ? 'entry' : 'entries'} submitted`;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={styles.blobBig} />
          <View style={styles.blobSmall} />

          <View style={styles.topRow}>
            <View style={styles.logo} accessibilityLabel="Fleet Manager">
              <Ionicons name="truck" size={18} color={NAVY} />
            </View>
            <View style={styles.topRight}>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={showNotifications}
                hitSlop={8}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={19} color={WHITE} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatar}
                onPress={() => navigation.navigate('Profile')}
                hitSlop={8}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Driver profile"
              >
                <Text style={styles.avatarText}>
                  {initialsOf(session?.name, session?.username)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.greeting}>{greetingFor(new Date().getHours())}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {session?.name || 'Driver'}
          </Text>
          <Text style={styles.date}>{dateLine()}</Text>
        </View>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleTop}>
            <Text style={styles.vehicleEyebrow}>YOUR ASSIGNED VEHICLE</Text>
            {vehicleBadge ? (
              <StatusBadge label={vehicleBadge.label} tone={vehicleBadge.tone} />
            ) : null}
          </View>

          <View style={styles.vehicleMid}>
            <View style={styles.vehicleIcon}>
              <Ionicons name="truck" size={22} color={NAVY} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleReg} numberOfLines={1}>
                {vehicle ? vehicle.registrationNo : 'No vehicle assigned'}
              </Text>
              <Text style={styles.vehicleModel} numberOfLines={1}>
                {vehicleModel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </View>

          <View style={styles.vehicleBottom}>
            <View style={styles.statusLine}>
              <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
              <Text style={styles.statusText} numberOfLines={1}>
                {vehicleReadyLine}
              </Text>
            </View>
            <Text style={styles.updatedAt}>
              Updated {formatTime(syncedAt.toISOString())}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>QUICK ACTIONS</Text>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('WorkEntry')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add work entry"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="add-outline" size={17} color={NAVY} />
            </View>
            <Text style={styles.actionTitle}>Add Work Entry</Text>
            <Text style={styles.actionSub}>Record today's work</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MyEntries')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Work history"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="time-outline" size={17} color={NAVY} />
            </View>
            <Text style={styles.actionTitle}>Work History</Text>
            <Text style={styles.actionSub}>Track your submissions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.todayHead}>
          <View style={styles.todayHeadMain}>
            <Text style={styles.sectionTitle}>Today's activity</Text>
            {count > 0 ? <Text style={styles.todaySub}>{countLine}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('MyEntries')}
            hitSlop={8}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="View all entries"
          >
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {todayEntries.length === 0 ? (
            <EmptyState
              title="No entries yet today"
              subtitle="Work entries you submit today will appear here."
            />
          ) : (
            todayEntries.slice(0, 4).map((entry, index) => (
              <React.Fragment key={entry.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Ionicons name="briefcase-outline" size={17} color={NAVY} />
                  </View>
                  <View style={styles.activityMain}>
                    <Text style={styles.activityTime}>
                      {formatTime(entry.createdAt)}
                    </Text>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {entry.customer}
                    </Text>
                    <Text style={styles.activityDetail} numberOfLines={1}>
                      {workLine(entry)}
                    </Text>
                  </View>
                  <StatusBadge
                    label={statusLabel(entry.status)}
                    tone={statusTone(entry.status)}
                  />
                </View>
              </React.Fragment>
            ))
          )}
        </View>

        <Text style={styles.privacyNote}>
          Financial details are unavailable for drivers.
        </Text>
      </ScrollView>

      {alertNode}
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
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingBottom: 46,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: 'hidden',
  },
  blobBig: {
    position: 'absolute',
    top: 30,
    right: -46,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  blobSmall: {
    position: 'absolute',
    top: 118,
    right: 54,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 0.3,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 4,
  },
  name: {
    fontSize: 30,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 7,
  },
  vehicleCard: {
    marginHorizontal: 16,
    marginTop: -34,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    padding: 14,
    elevation: 3,
    shadowColor: DARK,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  vehicleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vehicleEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: MUTED,
  },
  vehicleMid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
    paddingRight: 8,
  },
  vehicleReg: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.2,
  },
  vehicleModel: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  vehicleBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F5F9',
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11.5,
    color: MUTED,
    fontWeight: '600',
  },
  updatedAt: {
    fontSize: 10.5,
    color: MUTED,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: MUTED,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF3F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: TEXT,
  },
  actionSub: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 3,
  },
  todayHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  todayHeadMain: {
    flex: 1,
    paddingRight: 10,
  },
  todaySub: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 4,
  },
  viewAll: {
    fontSize: 12.5,
    fontWeight: '800',
    color: NAVY,
    marginTop: 3,
  },
  activityCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F5F9',
    marginLeft: 62,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EEF3F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityMain: {
    flex: 1,
    paddingRight: 8,
  },
  activityTime: {
    fontSize: 10.5,
    color: MUTED,
    fontWeight: '600',
  },
  activityName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: TEXT,
    marginTop: 1,
  },
  activityDetail: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 2,
  },
  privacyNote: {
    fontSize: 10.5,
    color: MUTED,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 24,
  },
});
