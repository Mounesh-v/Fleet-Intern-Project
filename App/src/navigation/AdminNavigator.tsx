// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ProfileScreen from '../screens/driver/ProfileScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminFleetScreen from '../screens/admin/AdminFleetScreen';
import AdminEntriesScreen from '../screens/admin/AdminEntriesScreen';
import AdminFinanceScreen from '../screens/admin/AdminFinanceScreen';
import { AdminCustomersScreen, AdminQuarriesScreen, AdminMaterialsScreen } from '../screens/admin/AdminMasterScreens';
import AdminRatesScreen from '../screens/admin/AdminRatesScreen';
import AdminLedgerScreen from '../screens/admin/AdminLedgerScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminStatementScreen from '../screens/admin/AdminStatementScreen';
import AdminReportDetailScreen from '../screens/admin/AdminReportDetailScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import { useAuth } from '../features/auth/context/authContext';
import { C } from '../themeCompat';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminProfileRoute({ navigation }) {
  const { user, signOut } = useAuth();
  const session = {
    name: user?.username || 'Admin',
    username: user?.username || '',
    employeeId: user?.role || 'ADMIN',
    vehicle: '—',
  };
  return (
    <ProfileScreen
      session={session}
      onLogout={signOut}
      admin
      user={user}
      navigation={navigation}
    />
  );
}

const getTabIcon =
  routeName =>
  ({ focused, color }) => {
    const icons = {
      Home: ['home-outline', 'home'],
      Vehicles: ['car-sport-outline', 'car-sport'],
      Work: ['clipboard-outline', 'clipboard'],
      Finance: ['wallet-outline', 'wallet'],
      More: ['grid-outline', 'grid'],
    };

    const [outline, filled] = icons[routeName];

    return (
      <View style={focused ? styles.pill : styles.iconBox}>
        <Ionicons
          name={focused ? filled : outline}
          size={23}
          color={focused ? C.primary : color}
        />
      </View>
    );
  };

/**
 * Admin role shell — five tabs (Home, Vehicles, Work, Finance, More)
 * wrapped in a native stack so the More menu can push the detail
 * screens (Drivers, Customers, Quarries, Materials, Rates, Ledger,
 * Reports, Settings) over the tabs. Active tab shows a yellow pill
 * behind a navy icon.
 */
function AdminTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          { paddingBottom: bottomInset, height: 56 + bottomInset },
        ],
      }}
    >
      <Tab.Screen
        name="Home"
        component={AdminDashboardScreen}
        options={{ tabBarIcon: getTabIcon('Home') }}
      />

      <Tab.Screen
        name="Vehicles"
        component={AdminFleetScreen}
        options={{ tabBarIcon: getTabIcon('Vehicles') }}
      />

      <Tab.Screen
        name="Work"
        component={AdminEntriesScreen}
        options={{ tabBarIcon: getTabIcon('Work') }}
      />

      <Tab.Screen
        name="Finance"
        component={AdminFinanceScreen}
        options={{ tabBarIcon: getTabIcon('Finance') }}
      />

      <Tab.Screen
        name="More"
        component={AdminProfileRoute}
        options={{ tabBarIcon: getTabIcon('More') }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      {/* Drivers reuses the fleet screen in its dormant drivers view. */}
      <Stack.Screen
        name="Drivers"
        component={AdminFleetScreen}
        initialParams={{ view: 'drivers' }}
      />
      <Stack.Screen name="Customers" component={AdminCustomersScreen} />
      <Stack.Screen name="Quarries" component={AdminQuarriesScreen} />
      <Stack.Screen name="Materials" component={AdminMaterialsScreen} />
      <Stack.Screen name="Rates" component={AdminRatesScreen} />
      <Stack.Screen name="Ledger" component={AdminLedgerScreen} />
      <Stack.Screen name="Reports" component={AdminReportsScreen} />
      <Stack.Screen name="Statement" component={AdminStatementScreen} />
      <Stack.Screen name="ReportDetail" component={AdminReportDetailScreen} />
      <Stack.Screen name="Settings" component={AdminSettingsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.surface,
    borderTopColor: C.border,
    borderTopWidth: 1,
    paddingTop: 8,
    elevation: 10,
    shadowColor: '#102030',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
  },
  tabLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  iconBox: {
    height: 32,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: C.accent,
    borderRadius: 14,
    width: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
