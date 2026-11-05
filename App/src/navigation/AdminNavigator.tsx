// @ts-nocheck
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ProfileScreen from '../screens/driver/ProfileScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminFleetScreen from '../screens/admin/AdminFleetScreen';
import AdminEntriesScreen from '../screens/admin/AdminEntriesScreen';
import { useAuth } from '../features/auth/context/authContext';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#182A38',
  accent: '#F5BD32',
  muted: '#A0A4AA',
  surface: '#FFFDFA',
  border: '#E5DDD0',
  background: '#F7F3EB',
};

function AdminProfileRoute() {
  const { user, signOut } = useAuth();
  const session = {
    name: user?.username || 'Admin',
    username: user?.username || '',
    employeeId: user?.role || 'ADMIN',
    vehicle: '—',
  };
  return <ProfileScreen session={session} onLogout={signOut} />;
}

function adminTabBarIcon({ route }) {
  return ({ color, size, focused }) => {
    const icons = {
      Dashboard: focused ? 'grid' : 'grid-outline',
      Fleet: focused ? 'car-sport' : 'car-sport-outline',
      Entries: focused ? 'clipboard' : 'clipboard-outline',
      Profile: focused ? 'person-circle' : 'person-circle-outline',
    };
    return <Ionicons name={icons[route.name]} size={size} color={color} />;
  };
}

/**
 * Admin role shell: dashboard KPIs, fleet master data,
 * work-entry verification, profile.
 */
export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
        },
        tabBarIcon: adminTabBarIcon({ route }),
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Fleet" component={AdminFleetScreen} />
      <Tab.Screen name="Entries" component={AdminEntriesScreen} />
      <Tab.Screen name="Profile" component={AdminProfileRoute} />
    </Tab.Navigator>
  );
}
