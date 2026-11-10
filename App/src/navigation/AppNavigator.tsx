import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../features/auth/context/authContext';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import DriverNavigator from './DriverNavigator';

const NAVY = '#182A3D';
const YELLOW = '#F5B923';
const GREY_TEXT = '#B9C4D1';

const TRACK_WIDTH = 168;
const SEGMENT_WIDTH = 44;

/**
 * Splash shown while AuthProvider restores the session (isLoading) and
 * for the 5-second minimum display. The bar is indeterminate — it
 * mirrors real init progress without a fake percentage.
 */
function SplashView() {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [fade, slide, progress]);

  const segmentX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SEGMENT_WIDTH, TRACK_WIDTH],
  });
  const brandY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return (
    <View style={styles.splash}>
      <StatusBar barStyle="light-content" />

      {/* Concentric rings + dotted arc */}
      <View pointerEvents="none" style={styles.ringsWrap}>
        <View style={styles.ringLarge} />
        <View style={styles.ringMid} />
        <View style={styles.ringSmall} />
        <View style={styles.dottedArc} />
      </View>

      {/* Center branding */}
      <Animated.View
        style={[
          styles.brand,
          { opacity: fade, transform: [{ translateY: brandY }] },
        ]}
      >
        <View style={styles.logo}>
          <Ionicons name="navigate" size={50} color={NAVY} />
        </View>
        <Text style={styles.appName}>JCB Fleet</Text>
        <Text style={styles.appSuffix}>MANAGEMENT</Text>
        <Text style={styles.tagline}>
          {'Every machine. Every route.\nOne workspace.'}
        </Text>
      </Animated.View>

      {/* Loading indicator */}
      <View
        style={[styles.loadingBlock, { paddingBottom: insets.bottom + 34 }]}
      >
        <View style={styles.track}>
          <Animated.View
            style={[styles.segment, { transform: [{ translateX: segmentX }] }]}
          />
        </View>
        <Text style={styles.loadingText}>Loading your workspace...</Text>
      </View>
    </View>
  );
}

/**
 * Root navigator — routes by authentication state and role.
 * Role comes from the server session, never from client input.
 * The splash is held for at least 5 seconds while session restoration
 * runs in parallel; navigation mounts only once both are done.
 */
export default function AppNavigator() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !splashDone) {
    return <SplashView />;
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
  splash: {
    flex: 1,
    backgroundColor: NAVY,
    overflow: 'hidden',
  },

  ringsWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 110,
  },
  ringLarge: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    borderWidth: 1,
    borderColor: 'rgba(245,185,35,0.06)',
  },
  ringMid: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: 'rgba(245,185,35,0.10)',
  },
  ringSmall: {
    position: 'absolute',
    width: 262,
    height: 262,
    borderRadius: 131,
    borderWidth: 1,
    borderColor: 'rgba(245,185,35,0.16)',
  },
  dottedArc: {
    position: 'absolute',
    bottom: -70,
    right: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(245,185,35,0.20)',
  },

  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 30,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: YELLOW,
    shadowOpacity: 0.5,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  appName: {
    marginTop: 26,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  appSuffix: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 6,
    color: YELLOW,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 18,
    fontSize: 14.5,
    lineHeight: 23,
    color: GREY_TEXT,
    textAlign: 'center',
  },

  loadingBlock: {
    alignItems: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2F3D51',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SEGMENT_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: YELLOW,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: GREY_TEXT,
    textAlign: 'center',
  },
});
