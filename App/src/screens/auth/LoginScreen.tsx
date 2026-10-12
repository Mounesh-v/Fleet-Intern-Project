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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Field, PrimaryButton } from '../../components/UI';
import { translations } from '../../i18n/translations';
import { mockAuthenticate } from '../../services/mockAuth';

const COLORS = {
  background: '#F7F2E8',
  surface: '#FFFDFA',
  primary: '#182535',
  primarySoft: '#223449',
  onPrimaryMuted: '#9FAABA',
  accent: '#F5B923',
  secondary: '#6B7077',
  border: '#E6DED0',
  danger: '#C43D35',
  dangerSoft: '#FBECEA',
};

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
];

export default function LoginScreen({ onLogin, onForgotPassword }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const t = (key, fallback = '') =>
    translations[language]?.[key] ||
    translations.en?.[key] ||
    fallback ||
    key;

  const clearError = () => {
    if (error) setError('');
  };

  const submit = () => {
    if (!username.trim() || !password.trim()) {
      setError(t('requiredFields'));
      return;
    }

    // Mock driver authentication only — replaced by backend login in production.
    const session = mockAuthenticate(username, password);

    if (!session) {
      setError(t('invalidCredentials'));
      return;
    }

    setError('');
    onLogin?.({ ...session, language });
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
                <Text style={styles.lockupText}>Fleet Manager</Text>
              </View>

              <View style={styles.segment} accessibilityRole="radiogroup">
                {LANGUAGES.map(item => {
                  const active = language === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      onPress={() => setLanguage(item.code)}
                      style={[styles.segmentItem, active && styles.segmentActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={item.name}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Text style={styles.title}>
              {t('driverSignIn', 'Driver sign in')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.sheet}>
            <View style={styles.formCard}>
              <Field
                label={t('username')}
                value={username}
                onChangeText={text => {
                  setUsername(text);
                  clearError();
                }}
                placeholder={t('usernamePlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Field
                label={t('password')}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  clearError();
                }}
                placeholder={t('passwordPlaceholder')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onSubmitEditing={submit}
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

              <TouchableOpacity
                style={styles.forgot}
                onPress={() => onForgotPassword?.()}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.forgotText}>
                  {t('forgotPassword', 'Forgot password?')}
                </Text>
              </TouchableOpacity>

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

              <PrimaryButton
                title={t('login')}
                onPress={submit}
                style={styles.loginButton}
              />
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

  // Header
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
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  segmentItem: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: COLORS.surface,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onPrimaryMuted,
  },
  segmentTextActive: {
    color: COLORS.primary,
  },
  title: {
    marginTop: 44,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.9,
    color: '#FFFFFF',
  },

  // Form
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
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
    textDecorationColor: COLORS.accent,
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
  },
});