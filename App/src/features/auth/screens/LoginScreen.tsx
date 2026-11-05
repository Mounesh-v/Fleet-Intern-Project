// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Field, PrimaryButton } from '../../../components/UI';
import { useAuth } from '../context/authContext';

const COLORS = {
  background: '#F7F2E8',
  surface: '#FFFDFA',
  primary: '#182535',
  accent: '#F5B923',
  secondary: '#6B7077',
  border: '#E6DED0',
  danger: '#C43D35',
  dangerSoft: '#FBECEA',
};

export default function LoginScreen() {
  const { signIn, isSigningIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const clearError = () => {
    if (error) setError('');
  };

  const submit = async () => {
    if (isSigningIn) return;

    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    clearError();
    try {
      await signIn(username.trim(), password);
      // Navigation switches automatically via AuthContext.
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.topRow}>
              <View style={styles.lockup}>
                <View style={styles.logoMark}>
                  <Ionicons name="navigate" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.lockupText}>JCB Fleet Management</Text>
              </View>
            </View>

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to manage your fleet workspace
            </Text>
          </View>

          {/* Form */}
          <View style={styles.sheet}>
            <View style={styles.formCard}>
              <Field
                label="Username"
                value={username}
                onChangeText={text => {
                  setUsername(text);
                  clearError();
                }}
                placeholder="Enter your username"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />

              <Field
                label="Password"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  clearError();
                }}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onSubmitEditing={submit}
                returnKeyType="go"
                right={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.secondary}
                    />
                  </TouchableOpacity>
                }
              />

              {!!error && (
                <View style={styles.errorBox} accessibilityLiveRegion="polite">
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={COLORS.danger}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.buttonWrap}>
                <PrimaryButton
                  title={isSigningIn ? 'Signing in…' : 'Sign in'}
                  onPress={submit}
                  disabled={isSigningIn}
                  style={styles.loginButton}
                />
                {isSigningIn && (
                  <ActivityIndicator
                    style={styles.spinner}
                    color={COLORS.primary}
                  />
                )}
              </View>

              <Text style={styles.hint}>
                Contact your administrator if you forgot your password.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  kav: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 72,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockupText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  title: {
    marginTop: 40,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#C5CDD6',
    lineHeight: 20,
  },

  sheet: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: COLORS.background,
  },
  formCard: {
    marginTop: -40,
    padding: 20,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#F2C9C5',
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: COLORS.accent,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrap: {
    position: 'relative',
  },
  spinner: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
  },
  hint: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.secondary,
    lineHeight: 18,
  },
});
