// @ts-nocheck
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import WorkEntryScreen from '../screens/driver/WorkEntryScreen';
import MyEntriesScreen from '../screens/driver/MyEntriesScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';
import { workEntries } from '../data/mockData';
import { useAuth } from '../features/auth/context/authContext';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#182A38',
  muted: '#A0A4AA',
  surface: '#FFFDFA',
  border: '#E5DDD0',
};

const DriverEntriesContext = createContext(null);

function useDriverEntries() {
  return useContext(DriverEntriesContext);
}

function buildSession(user) {
  return {
    driverId: user?.driverId || null,
    username: user?.username || '',
    name: user?.name || user?.username || 'Driver',
    employeeId: user?.employeeId || user?.username || '',
    phone: user?.phone || '',
    vehicle: user?.vehicle || '',
    role: user?.role,
  };
}

function WorkEntryRoute() {
  const { session, addEntry } = useDriverEntries();
  return <WorkEntryScreen session={session} onSave={addEntry} />;
}

function MyEntriesRoute() {
  const { session, entries } = useDriverEntries();
  return <MyEntriesScreen session={session} entries={entries} />;
}

function ProfileRoute() {
  const { session, signOut } = useDriverEntries();
  return <ProfileScreen session={session} onLogout={signOut} />;
}

function tabIcon(name, focused) {
  return focused ? name.replace('-outline', '') : name;
}

function driverTabBarIcon({ route }) {
  return ({ color, size, focused }) => {
    const icons = {
      WorkEntry: tabIcon('create-outline', focused),
      MyEntries: tabIcon('receipt-outline', focused),
      Profile: tabIcon('person-circle-outline', focused),
    };
    return <Ionicons name={icons[route.name]} size={size} color={color} />;
  };
}

/**
 * Driver role shell: work entry, own entries, profile.
 * Drivers only ever see their own records (backend enforces this too).
 */
export default function DriverNavigator() {
  const { user, signOut } = useAuth();
  const session = useMemo(() => buildSession(user), [user]);

  const [entries, setEntries] = useState(() =>
    workEntries.filter(entry => entry.driverId === session.driverId),
  );

  const addEntry = useCallback(
    entry => {
      setEntries(current => [
        {
          ...entry,
          id: `local-${Date.now()}`,
          driverId: session.driverId,
          driverName: session.name,
          username: session.username,
        },
        ...current,
      ]);
    },
    [session.driverId, session.name, session.username],
  );

  const contextValue = useMemo(
    () => ({ session, entries, addEntry, signOut }),
    [session, entries, addEntry, signOut],
  );

  return (
    <DriverEntriesContext.Provider value={contextValue}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.muted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
          },
          tabBarIcon: driverTabBarIcon({ route }),
        })}
      >
        <Tab.Screen
          name="WorkEntry"
          options={{ title: 'Work entry' }}
          component={WorkEntryRoute}
        />
        <Tab.Screen
          name="MyEntries"
          options={{ title: 'My entries' }}
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
