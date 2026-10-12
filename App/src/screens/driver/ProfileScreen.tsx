
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Screen, Card, SectionTitle } from '../../components/UI';

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
  softRed: '#FBECEA',
  danger: '#B93830',
};

export default function ProfileScreen({
  session,
  t,
  language,
  onToggleLanguage,
  onLogout,
}) {
  const name = session?.name || 'Driver';
  const username = session?.username || '';
  const initial = (name || username || 'D')
    .slice(0, 1)
    .toUpperCase();

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>
            {t('driverPortal', 'DRIVER PORTAL')}
          </Text>
          <Text style={styles.heading}>
            {t('profile', 'My Profile')}
          </Text>
          <Text style={styles.subtitle}>
            {t('profileSubtitle', 'Your account and preferences')}
          </Text>
        </View>

        {/* Driver identity */}
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <View style={styles.identity}>
              <Text style={styles.name}>{name}</Text>
              {!!username && (
                <Text style={styles.username}>@{username}</Text>
              )}

              <View style={styles.driverBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>
                  {t('driver', 'Driver')}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Driver information */}
        <SectionTitle title={t('driverInfo', 'Driver information')} />

        <View style={styles.infoCard}>
          <InfoRow
            icon="id-card-outline"
            label={t('employeeId', 'Employee ID')}
            value={session?.employeeId || '—'}
          />

          <View style={styles.divider} />

          <InfoRow
            icon="car-outline"
            label={t('assignedVehicle', 'Assigned vehicle')}
            value={session?.vehicle || '—'}
          />
        </View>

        {/* Preferences */}
        <SectionTitle title={t('preferences', 'Preferences')} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={onToggleLanguage}
          accessibilityRole="button"
          accessibilityLabel={t('languageLabel', 'App language')}
          activeOpacity={0.75}
        >
          <View style={styles.actionIcon}>
            <Ionicons
              name="language-outline"
              size={21}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>
              {t('languageLabel', 'App language')}
            </Text>
            <Text style={styles.actionSubtitle}>
              {language === 'en' ? 'English' : 'தமிழ்'}
            </Text>
          </View>

          <View style={styles.languageValue}>
            <Text style={styles.languageValueText}>
              {language === 'en' ? 'தமிழ்' : 'EN'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.secondary}
            />
          </View>
        </TouchableOpacity>

        {/* Account */}
        <SectionTitle title={t('account', 'Account')} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={onLogout}
          accessibilityRole="button"
          activeOpacity={0.75}
        >
          <View style={styles.logoutIcon}>
            <Ionicons
              name="log-out-outline"
              size={21}
              color={COLORS.danger}
            />
          </View>

          <View style={styles.actionCopy}>
            <Text style={styles.logoutTitle}>
              {t('signOut', 'Sign out')}
            </Text>
            <Text style={styles.actionSubtitle}>
              {t('returnToLogin', 'Return to the login screen')}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.muted}
          />
        </TouchableOpacity>

        <Text style={styles.version}>
          Fleet Manager · Driver
        </Text>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 30,
  },

  pageHeader: {
    marginBottom: 22,
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 12,
    marginTop: 5,
  },

  profileCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 26,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 29,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
  },
  name: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '800',
  },
  username: {
    color: COLORS.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  driverBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.softYellow,
    marginTop: 9,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9A6A00',
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.softBeige,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCopy: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  infoValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  actionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    marginBottom: 11,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.softYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 5,
  },
  languageValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  languageValueText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.softRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutTitle: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '800',
  },

  version: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 24,
  },
});
