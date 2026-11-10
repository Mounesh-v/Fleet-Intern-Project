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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/authContext';

const COLORS = {
  navy: '#182A3D',
  yellow: '#F5B923',
  beige: '#F5F1E8',
  white: '#FFFFFF',
  inputBorder: '#DED6C8',
  text: '#263447',
  textSecondary: '#778397',
  onNavy: '#C5CDD6',
  danger: '#C43D35',
  dangerSoft: '#FBECEA',
  dangerBorder: '#F2C9C5',
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
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
          {/* Branding header */}
          <View style={styles.header}>
            {/* Decorative concentric circles + dotted arcs */}
            <View pointerEvents="none" style={styles.deco}>
              <View style={styles.decoCircleBig} />
              <View style={styles.decoCircleDashed} />
              <View style={styles.decoArc} />
              <View style={styles.decoDotYellow} />
              <View style={styles.decoDotWhite} />
            </View>

            <View style={styles.lockup}>
              <View style={styles.logoMark}>
                <Ionicons name="navigate" size={20} color={COLORS.navy} />
              </View>
              <Text style={styles.lockupText}>JCB Fleet Management</Text>
            </View>

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to manage your fleet workspace
            </Text>
          </View>

          {/* Login form card */}
          <View style={styles.sheet}>
            <View style={styles.formCard}>
              <LoginField
                label="Username"
                icon="person-outline"
                placeholder="Enter your username"
                value={username}
                onChangeText={text => {
                  setUsername(text);
                  clearError();
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />

              <LoginField
                label="Password"
                icon="lock-closed-outline"
                placeholder="Enter your password"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  clearError();
                }}
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
                      name={
                        showPassword ? 'eye-off-outline' : 'eye-outline'
                      }
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              {!!error && (
                <View
                  style={styles.errorBox}
                  accessibilityLiveRegion="polite"
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={COLORS.danger}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.signInBtn, isSigningIn && styles.signInBtnBusy]}
                onPress={submit}
                disabled={isSigningIn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <Text style={styles.signInText}>
                  {isSigningIn ? 'Signing in…' : 'Sign in'}
                </Text>
                {isSigningIn ? (
                  <ActivityIndicator size="small" color={COLORS.navy} />
                ) : (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.navy}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.footerText}>Secure, encrypted sign-in</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Labelled rounded input with a leading icon and optional trailing slot. */
function LoginField({ label, icon, right, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  kav: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: COLORS.beige,
  },

  /* ---- Branding header ---- */
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 76,
    overflow: 'hidden',
  },
  deco: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decoCircleBig: {
    position: 'absolute',
    top: -72,
    right: -64,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  decoCircleDashed: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  decoArc: {
    position: 'absolute',
    bottom: -56,
    left: -46,
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  decoDotYellow: {
    position: 'absolute',
    top: 104,
    right: 118,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(245,185,35,0.9)',
  },
  decoDotWhite: {
    position: 'absolute',
    top: 136,
    right: 44,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockupText: {
    color: COLORS.white,
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  title: {
    marginTop: 36,
    fontSize: 33,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.9,
    color: COLORS.white,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.onNavy,
  },

  /* ---- Form card ---- */
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  formCard: {
    marginTop: -40,
    padding: 22,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#EFE9DE',
    shadowColor: COLORS.navy,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },

  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },

  signInBtn: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: COLORS.yellow,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  signInBtnBusy: {
    opacity: 0.75,
  },
  signInText: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  /* ---- Footer ---- */
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
});
