import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../features/auth/context/authContext';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import DriverNavigator from './DriverNavigator';

const COLORS = {
  background: '#F7F2E8',
  primary: '#182A38',
};

/**
 * Root navigator — routes by authentication state and role.
 * Role comes from the server session, never from client input.
 */
export default function AppNavigator() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : role === 'ADMIN' ? (
        <AdminNavigator />
      ) : (
        <DriverNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
