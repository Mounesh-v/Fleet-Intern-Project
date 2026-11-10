// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Screen, Badge } from '../../components/UI';
import { useCustomAlert } from '../../components/CustomAlert';
import { useAuth } from '../../features/auth/context/authContext';

/**
 * AdminSettingsScreen — account profile from the auth session, session
 * actions (sign out). Password change has no backend endpoint yet, so
 * the row explains where it will live instead of faking a form.
 */
export default function AdminSettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { alert, alertNode } = useCustomAlert();

  const name = user?.name || user?.username || 'Admin';
  const role = user?.role === 'ADMIN' ? 'Super Admin' : user?.role || 'Admin';
  const isActive = (user?.status || 'ACTIVE') === 'ACTIVE';

  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : (parts[0] || 'AD').slice(0, 2).toUpperCase();

  const confirmSignOut = () => {
    alert('Sign out', 'You will return to the login screen.', {
      type: 'info',
      cancel: true,
      confirmText: 'Sign out',
      onConfirm: signOut,
    });
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#182F50" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Admin settings</Text>
            <Text style={styles.subtitle}>Profile, security & logout</Text>
          </View>
        </View>

        {/* Navy profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.profileName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.profileRole}>{role}</Text>
          </View>
          <View style={[styles.status, !isActive && styles.statusOff]}>
            <View style={[styles.statusDot, !isActive && styles.statusDotOff]} />
            <Text style={styles.statusText}>{isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        {/* Account details */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <InfoRow
            icon="person-outline"
            label="Username"
            value={user?.username || '—'}
          />
          <View style={styles.divider} />
          <InfoRow icon="shield-checkmark-outline" label="Role" value={role} />
          <View style={styles.divider} />
          <InfoRow
            icon="mail-outline"
            label="Name"
            value={user?.name || '—'}
          />
        </View>

        {/* Security */}
        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.card}>
          <InfoRow
            icon="key-outline"
            label="Password"
            value="Managed by the server admin"
            muted
          />
          <View style={styles.divider} />
          <InfoRow
            icon="lock-closed-outline"
            label="Session"
            value={isActive ? 'Signed in' : 'Inactive'}
          />
        </View>
        <Text style={styles.note}>
          Self-service password change is not available yet — ask the server
          admin to reset credentials.
        </Text>

        {/* Session */}
        <Text style={styles.sectionLabel}>SESSION</Text>
        <TouchableOpacity
          style={styles.signOutRow}
          onPress={confirmSignOut}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.signOutIcon}>
            <Ionicons name="log-out-outline" size={19} color="#C43D35" />
          </View>
          <View style={styles.signOutCopy}>
            <Text style={styles.signOutTitle}>Sign out</Text>
            <Text style={styles.signOutSub}>Return to the login screen</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#85858A" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Badge label="BuiltFleet Admin · Version 1.0" tone="blue" />
        </View>
      </ScrollView>
      {alertNode}
    </Screen>
  );
}

function InfoRow({ icon, label, value, muted = false }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color="#33507A" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, muted && styles.infoValueMuted]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: '#F6F1E7',
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDFA',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E0D2',
  },
  back: {
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#182F50',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#85858A',
    marginTop: 4,
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#182F50',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5B923',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#182F50',
  },
  identity: {
    flex: 1,
  },
  profileName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFDFA',
  },
  profileRole: {
    fontSize: 12,
    color: '#9DB1CE',
    marginTop: 3,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22,132,91,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusOff: {
    backgroundColor: 'rgba(196,61,53,0.25)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16845B',
  },
  statusDotOff: {
    backgroundColor: '#F0A6A1',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E7FFF4',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#85858A',
    letterSpacing: 0.8,
    marginTop: 20,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    backgroundColor: '#FFFDFA',
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingVertical: 8,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EFF3F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  infoLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#292D32',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#33507A',
    maxWidth: '52%',
    textAlign: 'right',
  },
  infoValueMuted: {
    color: '#85858A',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F5F9',
  },
  note: {
    fontSize: 11.5,
    color: '#85858A',
    marginHorizontal: 18,
    marginTop: 8,
    lineHeight: 16,
  },
  signOutRow: {
    marginHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    backgroundColor: '#FFFDFA',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  signOutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FCEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  signOutCopy: {
    flex: 1,
    paddingRight: 10,
  },
  signOutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C43D35',
  },
  signOutSub: {
    fontSize: 11.5,
    color: '#85858A',
    marginTop: 3,
  },
  footer: {
    alignItems: 'center',
    marginTop: 22,
  },
});
