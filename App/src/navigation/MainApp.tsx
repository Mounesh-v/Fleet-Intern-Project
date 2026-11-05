
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { workEntries } from '../data/mockData';

import WorkEntryScreen from '../screens/driver/WorkEntryScreen';
import MyEntriesScreen from '../screens/driver/MyEntriesScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';

const COLORS = {
  background: '#F7F3EB',
  surface: '#FFFDFA',
  primary: '#182A38',
  accent: '#F5BD32',
  text: '#252D35',
  secondary: '#777C83',
  muted: '#A0A4AA',
  border: '#E5DDD0',
  activeBackground: '#FFF0C2',
};

const driverTabs = [
  { key: 'workEntry', icon: 'create-outline', label: 'Work entry' },
  { key: 'myEntries', icon: 'receipt-outline', label: 'My entries' },
  { key: 'profile', icon: 'person-circle-outline', label: 'Profile' },
];

export default function MainApp({ session, onLogout }) {
  const [screen, setScreen] = useState('workEntry');

  const [entries, setEntries] = useState(() =>
    workEntries.filter(
      entry => entry.driverId === session?.driverId,
    ),
  );

  const addEntry = entry => {
    setEntries(current => [
      {
        ...entry,
        id: `local-${Date.now()}`,
        driverId: session?.driverId,
        driverName: session?.name,
        username: session?.username,
      },
      ...current,
    ]);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'myEntries':
        return (
          <MyEntriesScreen
            session={session}
            entries={entries}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            session={session}
            onLogout={onLogout}
          />
        );

      default:
        return (
          <WorkEntryScreen
            session={session}
            onSave={addEntry}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandIcon}>
          <Ionicons
            name="navigate"
            size={21}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.brandCopy}>
          <Text style={styles.brand}>Fleet Manager</Text>
          <Text style={styles.subtitle}>
            Driver workspace
          </Text>
        </View>
      </View>

      {/* Current screen */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Driver navigation */}
      <View style={styles.bottomBar}>
        {driverTabs.map(tab => {
          const active = screen === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setScreen(tab.key)}
              style={styles.tab}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.tabIconWrap,
                  active && styles.tabIconActive,
                ]}
              >
                <Ionicons
                  name={active ? tab.icon.replace('-outline', '') : tab.icon}
                  size={21}
                  color={active ? COLORS.primary : COLORS.muted}
                />
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>

              {active && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandCopy: {
    flex: 1,
  },
  brand: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 3,
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Bottom navigation
  bottomBar: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 5,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIconWrap: {
    width: 42,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: COLORS.activeBackground,
  },
  tabLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  activeIndicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 3,
  },
});
