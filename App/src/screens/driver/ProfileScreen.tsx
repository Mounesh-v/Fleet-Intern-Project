
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/UI';
import { useCustomAlert } from '../../components/CustomAlert';
import { useAuth } from '../../features/auth/context/authContext';
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
  softBlue: '#EAF2F8',
  softRed: '#FCEAEA',
  danger: '#C43D35',
  infoBlue: '#315F8D',
};

/**
 * Admin More menu sections. Each `route` is registered in the admin
 * native stack (AdminNavigator) and is pushed over the tabs; rows with
 * a null route show an "unavailable" notice instead of a fake route.
 */
const MORE_SECTIONS = [
  {
    label: 'MASTER DATA',
    items: [
      { key: 'drivers', icon: 'people-outline', title: 'Drivers', subtitle: 'Accounts & assignments', route: 'Drivers' },
      { key: 'customers', icon: 'people-circle-outline', title: 'Customers', subtitle: 'Profiles, history & credit', route: 'Customers' },
      { key: 'quarries', icon: 'triangle-outline', title: 'Quarries & suppliers', subtitle: 'Contacts and locations', route: 'Quarries' },
      { key: 'materials', icon: 'cube-outline', title: 'Materials', subtitle: 'Units and default rates', route: 'Materials' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { key: 'rates', icon: 'bar-chart-outline', title: 'Rate management', subtitle: 'Vehicle and material rates', route: 'Rates' },
      { key: 'ledger', icon: 'receipt-outline', title: 'Customer ledger', subtitle: 'Bills, paid and balance', route: 'Ledger' },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { key: 'reports', icon: 'stats-chart-outline', title: 'Reports & analytics', subtitle: 'Business performance', route: 'Reports' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { key: 'settings', icon: 'settings-outline', title: 'Admin settings', subtitle: 'Profile, security & logout', route: 'Settings' },
    ],
  },
];

/** Up-to-two-letter initials from a real name (falls back to username). */
function initialsOf(name, username) {
  const source = String(name || username || 'Driver').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'DR';
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function ProfileScreen({
  session,
  onLogout,
  admin = false,
  user = null,
  navigation = null,
}) {
  const { user: rawUser } = useAuth();
  const authUser = rawUser as unknown as { status?: string } | null;
  const { alert, alertNode } = useCustomAlert();
  const insets = useSafeAreaInsets();

  if (admin) {
    return <AdminMore user={user} navigation={navigation} onLogout={onLogout} />;
  }

  const name = session?.name || session?.username || 'Driver';
  const username = session?.username || '';
  const isActive = (authUser?.status || 'ACTIVE') === 'ACTIVE';

  // Role line follows the assigned vehicle (e.g. "JCB Driver"), falling
  // back to the authenticated account role when no vehicle is assigned.
  const vehicleType = session?.vehicleInfo?.type || '';
  const roleLabel = vehicleType
    ? `${typeLabel(vehicleType)} Driver`
    : session?.role === 'DRIVER'
    ? 'Driver'
    : session?.role || 'Driver';

  const confirmLogout = () => {
    alert('Logout', 'You will be signed out of this device.', {
      type: 'info',
      cancel: true,
      confirmText: 'Logout',
      onConfirm: onLogout,
    });
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* Navy profile header */}
        <View style={[styles.header, { paddingTop: insets.top + 22 }]}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSub}>Account and preferences</Text>

          <View style={styles.headerCenter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initialsOf(name, username)}
              </Text>
            </View>

            <Text style={styles.headerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.headerRole}>{roleLabel}</Text>

            <View
              style={[styles.statusBadge, !isActive && styles.statusBadgeOff]}
            >
              <View
                style={[
                  styles.statusDot,
                  !isActive && styles.statusDotOff,
                ]}
              />
              <Text style={styles.statusText}>
                {isActive ? 'Account Active' : 'Account Inactive'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Driver information */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>DRIVER INFORMATION</Text>

            <InfoRow
              icon="call-outline"
              label="Mobile number"
              value={session?.phone || '—'}
            />

            <View style={styles.divider} />

            <InfoRow
              icon="car-outline"
              label="Assigned vehicle"
              value={session?.vehicle || '—'}
            />

            <View style={styles.divider} />

            <InfoRow
              icon="person-outline"
              label="Employee ID"
              value={session?.employeeId || '—'}
            />
          </View>

          {/* Settings */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>SETTINGS</Text>

            <SettingRow
              icon="log-out-outline"
              title="Logout"
              subtitle="Sign out of this device."
              danger
              onPress={confirmLogout}
            />
          </View>

          {/* Privacy notice */}
          <View style={styles.notice}>
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={COLORS.infoBlue}
            />
            <Text style={styles.noticeText}>
              Your account only provides access to your own work and expenses.
            </Text>
          </View>

          <Text style={styles.version}>Fleet Manager · Version 1.0</Text>
        </View>
      </ScrollView>
      {alertNode}
    </Screen>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>

      <View style={styles.rowCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle = '',
  value = '',
  danger = false,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? COLORS.danger : COLORS.primary}
        />
      </View>

      <View style={styles.rowCopy}>
        <Text
          style={[styles.settingTitle, danger && styles.settingTitleDanger]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>

      {value ? <Text style={styles.settingValue}>{value}</Text> : null}

      <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

/**
 * AdminMore — the admin "More" tab: navy profile card built from the real
 * logged-in user (auth context), sectioned menu cards, and the existing
 * sign-out. Rendered only when the admin navigator passes `admin`.
 */
function AdminMore({ user, navigation, onLogout }) {
  const { alert, alertNode } = useCustomAlert();

  const name = user?.name || user?.username || 'Admin';
  const role = user?.role === 'ADMIN' ? 'Super Admin' : user?.role || 'Admin';
  const isActive = (user?.status || 'ACTIVE') === 'ACTIVE';

  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : (parts[0] || 'AD').slice(0, 2).toUpperCase();

  const openItem = item => {
    if (item.route && navigation) {
      navigation.navigate(item.route);
      return;
    }
    alert(item.title, 'This screen is not available yet.', { type: 'info' });
  };

  return (
    <Screen style={styles.moreScreen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.moreScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.moreHeader}>
          <Text style={styles.moreTitle}>More</Text>
          <Text style={styles.moreSubtitle}>Manage your business</Text>
        </View>

        <View style={styles.moreBody}>
          {/* Navy admin profile card */}
          <View style={styles.moreProfileCard}>
            <View style={styles.moreAvatar}>
              <Text style={styles.moreInitials}>{initials}</Text>
            </View>
            <View style={styles.moreIdentity}>
              <Text style={styles.moreName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.moreRole}>{role}</Text>
            </View>
            <View style={[styles.moreStatus, !isActive && styles.moreStatusOff]}>
              <View
                style={[styles.moreStatusDot, !isActive && styles.moreStatusDotOff]}
              />
              <Text style={styles.moreStatusText}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {MORE_SECTIONS.map(section => (
            <View key={section.label} style={styles.moreSection}>
              <Text style={styles.moreSectionLabel}>{section.label}</Text>
              <View style={styles.moreCard}>
                {section.items.map((item, index) => (
                  <View key={item.key}>
                    {index > 0 ? <View style={styles.moreDivider} /> : null}
                    <TouchableOpacity
                      style={styles.moreRow}
                      onPress={() => openItem(item)}
                      activeOpacity={0.65}
                      accessibilityRole="button"
                    >
                      <View style={styles.moreIconBox}>
                        <Ionicons name={item.icon} size={19} color="#33507A" />
                      </View>
                      <View style={styles.moreRowCopy}>
                        <Text style={styles.moreRowTitle}>{item.title}</Text>
                        <Text style={styles.moreRowSub}>{item.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#85858A" />
                    </TouchableOpacity>
                  </View>
                ))}

                {section.label === 'ACCOUNT' ? (
                  <View>
                    <View style={styles.moreDivider} />
                    <TouchableOpacity
                      style={styles.moreRow}
                      onPress={onLogout}
                      activeOpacity={0.65}
                      accessibilityRole="button"
                    >
                      <View style={[styles.moreIconBox, styles.moreIconBoxDanger]}>
                        <Ionicons name="log-out-outline" size={19} color="#C43D35" />
                      </View>
                      <View style={styles.moreRowCopy}>
                        <Text style={[styles.moreRowTitle, styles.moreRowTitleDanger]}>
                          Sign out
                        </Text>
                        <Text style={styles.moreRowSub}>
                          Return to the login screen
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#85858A" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          ))}

          <Text style={styles.moreFooter}>BuiltFleet Admin · Version 1.0</Text>
        </View>
      </ScrollView>
      {alertNode}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* ---- Driver profile (theme: #F3F5F8 / #182F50 / #F5B923) ---- */
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingBottom: 34,
  },

  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: '#B7C3D4',
    fontSize: 12.5,
    marginTop: 5,
  },
  headerCenter: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 13,
    textAlign: 'center',
  },
  headerRole: {
    color: '#B7C3D4',
    fontSize: 12.5,
    marginTop: 5,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16845B',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 11,
  },
  statusBadgeOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  statusDotOff: {
    backgroundColor: '#C9D2DD',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },

  body: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 8,
    marginBottom: 14,
  },
  cardHeading: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconDanger: {
    backgroundColor: COLORS.softRed,
  },
  rowCopy: {
    flex: 1,
    paddingRight: 8,
  },
  infoLabel: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  infoValue: {
    color: COLORS.primary,
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 3,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingVertical: 11,
  },
  settingTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  settingTitleDanger: {
    color: COLORS.danger,
  },
  rowSub: {
    color: COLORS.secondary,
    fontSize: 11.5,
    marginTop: 3,
  },
  settingValue: {
    color: COLORS.secondary,
    fontSize: 12.5,
    fontWeight: '600',
    marginRight: 7,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    color: COLORS.infoBlue,
    fontSize: 12,
    lineHeight: 17,
  },

  version: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 16,
  },

  /* ---- Admin More screen (theme: #F6F1E7 / #182F50 / #F5B923) ---- */
  moreScreen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: '#F6F1E7',
  },
  moreScroll: {
    paddingBottom: 40,
  },
  moreHeader: {
    backgroundColor: '#FFFDFA',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E0D2',
  },
  moreTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#182F50',
    letterSpacing: -0.4,
  },
  moreSubtitle: {
    fontSize: 12.5,
    color: '#85858A',
    marginTop: 5,
  },
  moreBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  moreProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#182F50',
    borderRadius: 16,
    padding: 16,
  },
  moreAvatar: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: '#F5B923',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  moreInitials: {
    fontSize: 18,
    fontWeight: '900',
    color: '#182F50',
  },
  moreIdentity: {
    flex: 1,
    paddingRight: 10,
  },
  moreName: {
    color: '#FFFDFA',
    fontSize: 17,
    fontWeight: '800',
  },
  moreRole: {
    color: '#B7C3D4',
    fontSize: 12,
    marginTop: 4,
  },
  moreStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16845B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  moreStatusOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  moreStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFDFA',
  },
  moreStatusDotOff: {
    backgroundColor: '#C9D2DD',
  },
  moreStatusText: {
    color: '#FFFDFA',
    fontSize: 11,
    fontWeight: '800',
  },

  moreSection: {
    marginTop: 20,
  },
  moreSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#85858A',
    marginBottom: 9,
    marginLeft: 2,
  },
  moreCard: {
    backgroundColor: '#FFFDFA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#1B2B3F',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  moreIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF3F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  moreIconBoxDanger: {
    backgroundColor: '#FCEAEA',
  },
  moreRowCopy: {
    flex: 1,
    paddingRight: 8,
  },
  moreRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#292D32',
  },
  moreRowTitleDanger: {
    color: '#C43D35',
  },
  moreRowSub: {
    fontSize: 11.5,
    color: '#85858A',
    marginTop: 3,
  },
  moreDivider: {
    height: 1,
    backgroundColor: '#E9E0D2',
    marginLeft: 67,
  },
  moreFooter: {
    textAlign: 'center',
    color: '#85858A',
    fontSize: 11,
    marginTop: 28,
  },
});
