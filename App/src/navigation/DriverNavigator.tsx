// @ts-nocheck
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import WorkEntryScreen from '../screens/driver/WorkEntryScreen';
import MyEntriesScreen from '../screens/driver/MyEntriesScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';
import { Card, PrimaryButton, Loading } from '../components/UI';
import { C, S } from '../themeCompat';
import {
  fetchDriverSession,
  fetchDriverOptions,
  fetchMyEntries,
  createMyEntry,
} from '../services/driverService';
import { typeLabel } from '../services/adminService';
import { useAuth } from '../features/auth/context/authContext';

const Tab = createBottomTabNavigator();

const NAVY = '#182F50';
const YELLOW = '#F5B923';
const WHITE = '#FFFFFF';
const MUTED = '#8290A3';
const BG = '#F3F5F8';

const DriverEntriesContext = createContext(null);

function useDriverEntries() {
  return useContext(DriverEntriesContext);
}

/** Session view-model built from the real backend profile. */
function buildSession(profile) {
  const user = profile?.user;
  const driver = profile?.driver;
  const vehicle = driver?.vehicle;
  return {
    driverId: driver?._id || null,
    username: user?.username || '',
    name: driver?.name || user?.username || 'Driver',
    employeeId: driver?.employeeId || '',
    phone: driver?.phone || '',
    vehicle: vehicle ? `${vehicle.registrationNo} · ${typeLabel(vehicle.type)}` : '',
    vehicleInfo: vehicle
      ? {
          registrationNo: vehicle.registrationNo || '',
          type: vehicle.type || '',
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          status: vehicle.status || '',
        }
      : null,
    role: user?.role,
  };
}

/** Format an ISO timestamp's UTC date as DD/MM/YYYY (stable across zones). */
function formatUtcDay(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

/** Map a backend work entry to the display shape the driver screens expect. */
function mapEntry(entry) {
  const type = entry.type;
  const date = entry.date ? new Date(entry.date) : null;
  const dateISO =
    date && !Number.isNaN(date.getTime())
      ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      : '';
  return {
    id: entry._id,
    driverId: String(entry.driver?._id || entry.driver || ''),
    status: entry.status,
    type,
    date: formatUtcDay(entry.date),
    dateISO,
    createdAt: entry.createdAt || '',
    customer: entry.customer?.name || 'Customer',
    vehicle: entry.vehicle?.registrationNo || 'Vehicle',
    location: entry.location || 'Location',
    mobile: entry.mobile || '',
    material: entry.material?.name || '',
    quarry: entry.quarry?.name || '',
    hours: type === 'JCB' && entry.jcbHours ? String(entry.jcbHours) : '',
    loads:
      type === 'TIPPER' && entry.tipperLoads
        ? String(entry.tipperLoads)
        : type === 'TATA_ACE' && entry.aceTrips
        ? String(entry.aceTrips)
        : '',
    dieselAmount: entry.dieselAmount || '',
    dieselLitres: entry.dieselLitres || '',
    otherExpenses: entry.otherExpense || '',
    expenseCategory: entry.expenseCategory || '',
    expenseDescription: entry.expenseDescription || '',
    notes: entry.notes || '',
  };
}

function HomeRoute({ navigation }) {
  const { session, entries } = useDriverEntries();
  return (
    <DriverHomeScreen navigation={navigation} session={session} entries={entries} />
  );
}

function WorkEntryRoute({ route }) {
  const { session, options, addEntry } = useDriverEntries();
  return (
    <WorkEntryScreen
      session={session}
      options={options}
      onSave={addEntry}
      scrollSection={route?.params?.section || ''}
      scrollTrigger={route?.params?.t || 0}
    />
  );
}

function MyEntriesRoute() {
  const { session, entries } = useDriverEntries();
  return <MyEntriesScreen session={session} entries={entries} />;
}

function ProfileRoute() {
  const { session, signOut } = useDriverEntries();
  return <ProfileScreen session={session} onLogout={signOut} />;
}

/** Tab metadata for the custom bottom bar (spec: Home / Add Work / History / Profile). */
const TAB_META = {
  Home: { label: 'Home', icon: 'home' },
  WorkEntry: { label: 'Add Work', icon: 'add', prominent: true },
  MyEntries: { label: 'History', icon: 'time' },
  Profile: { label: 'Profile', icon: 'person' },
};

/**
 * Single tab item — proper component (hooks allowed): soft yellow active
 * tile with an animated scale/colour transition; Add Work renders as a
 * raised yellow rounded-square with a navy plus and a subtle shadow.
 */
function TabBarItem({ meta, focused, onPress }) {
  const prominent = Boolean(meta.prominent);
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    const timing = Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    });
    timing.start();
    return () => timing.stop();
  }, [anim, focused]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const tileBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(245,185,35,0)', YELLOW],
  });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [MUTED, NAVY],
  });

  const iconName = prominent
    ? 'add'
    : focused
      ? meta.icon
      : `${meta.icon}-outline`;
  const iconColor = focused || prominent ? NAVY : MUTED;

  return (
    <TouchableOpacity
      style={tabStyles.item}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={meta.label}
    >
      <Animated.View
        style={[
          tabStyles.tile,
          prominent && tabStyles.tileProminent,
          !prominent && { backgroundColor: tileBg, transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={iconName}
          size={prominent ? 25 : 20}
          color={iconColor}
        />
      </Animated.View>
      <Animated.Text
        style={[
          tabStyles.label,
          prominent && tabStyles.labelProminent,
          !prominent && { color: labelColor },
          !prominent && focused && tabStyles.labelActive,
        ]}
        numberOfLines={1}
      >
        {meta.label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

/**
 * Custom bottom navigation: floating white bar (rounded 22px, subtle
 * shadow) over a light grey background with safe-area spacing; focused
 * tabs get an animated soft yellow tile with navy icon/text, and Add
 * Work is a raised yellow plus tile with its label below.
 */
function DriverTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[tabStyles.outer, { paddingBottom: insets.bottom + 8 }]}>
      <View style={tabStyles.bar}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] || { label: route.name, icon: 'ellipse' };
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <TabBarItem
              key={route.key}
              meta={meta}
              focused={focused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const renderDriverTabBar = props => <DriverTabBar {...props} />;

/**
 * Driver role shell — everything is live from the backend:
 * profile + assigned vehicle, form options, own work entries.
 * Drivers only ever see their own records (server enforces this too).
 */
export default function DriverNavigator() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [options, setOptions] = useState({
    vehicles: [],
    materials: [],
    quarries: [],
  });
  const [boot, setBoot] = useState({ loading: true, error: '' });

  const loadAll = useCallback(async () => {
    setBoot({ loading: true, error: '' });
    try {
      const [p, e, o] = await Promise.all([
        fetchDriverSession(),
        fetchMyEntries('?limit=100'),
        fetchDriverOptions(),
      ]);
      setProfile(p);
      setEntries((e.entries || []).map(mapEntry));
      setOptions({
        vehicles: o.vehicles || [],
        materials: o.materials || [],
        quarries: o.quarries || [],
      });
      setBoot({ loading: false, error: '' });
    } catch (err) {
      setBoot({
        loading: false,
        error: err.message || 'Could not load your workspace.',
      });
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const session = useMemo(() => buildSession(profile), [profile]);

  /** Submit to the server, then refresh the list from the server. */
  const addEntry = useCallback(async body => {
    await createMyEntry(body);
    const data = await fetchMyEntries('?limit=100');
    setEntries((data.entries || []).map(mapEntry));
  }, []);

  const contextValue = useMemo(
    () => ({ session, entries, options, addEntry, signOut }),
    [session, entries, options, addEntry, signOut],
  );

  if (boot.loading) {
    return <Loading label="Loading your workspace…" />;
  }

  if (boot.error) {
    return (
      <View style={styles.errorShell}>
        <Card>
          <Text style={styles.errorTitle}>Could not load</Text>
          <Text style={styles.errorText}>{boot.error}</Text>
          <PrimaryButton title="Try again" onPress={loadAll} />
        </Card>
      </View>
    );
  }

  return (
    <DriverEntriesContext.Provider value={contextValue}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
        tabBar={renderDriverTabBar}
      >
        <Tab.Screen
          name="Home"
          options={{ title: 'Home' }}
          component={HomeRoute}
        />
        <Tab.Screen
          name="WorkEntry"
          options={{ title: 'Add Work' }}
          component={WorkEntryRoute}
        />
        <Tab.Screen
          name="MyEntries"
          options={{ title: 'History' }}
          component={MyEntriesRoute}
        />
        <Tab.Screen
          name="Profile"
          options={{ title: 'Profile' }}
          component={ProfileRoute}
        />
      </Tab.Navigator>
    </DriverEntriesContext.Provider>
  );
}

const styles = StyleSheet.create({
  errorShell: { flex: 1, justifyContent: 'center', padding: S.xl },
  errorTitle: { fontSize: 16, fontWeight: '800', color: C.primary, marginBottom: S.sm },
  errorText: { fontSize: 13, color: C.textSecondary, marginBottom: S.md, lineHeight: 18 },
});

const tabStyles = StyleSheet.create({
  outer: {
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: 22,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 6,
    overflow: 'visible',
    elevation: 8,
    shadowColor: '#102744',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minHeight: 56,
  },
  tile: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tileProminent: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginTop: -12,
    backgroundColor: YELLOW,
    elevation: 6,
    shadowColor: NAVY,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: MUTED,
  },
  labelProminent: {
    color: NAVY,
    fontWeight: '800',
  },
  labelActive: {
    fontWeight: '800',
  },
});
