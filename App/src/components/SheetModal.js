import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from 'react-native';
import { C, S } from '../themeCompat';

const SCREEN_H = Dimensions.get('window').height;

/**
 * SheetModal — draggable bottom-sheet shell for admin forms. Grows from
 * the bottom on open, collapses + fades on close before unmounting, and
 * the grabber drags to resize between content height and 90% of the
 * screen (pull down from the collapsed state to dismiss).
 */
export default function SheetModal({ visible, onClose, title, children }) {
  const [shown, setShown] = useState(false);
  const [contentH, setContentH] = useState(0);
  const backdrop = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const enteredRef = useRef(false);
  const dragStartH = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => {
    if (visible) {
      enteredRef.current = false;
      setShown(true);
      backdrop.setValue(0);
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setShown(false);
    });
  }, [visible, backdrop, heightAnim]);

  useEffect(() => {
    if (visible && shown && contentH > 0 && !enteredRef.current) {
      enteredRef.current = true;
      const target = Math.min(contentH, Math.round(SCREEN_H * 0.9));
      heightRef.current = 0;
      heightAnim.setValue(0);
      Animated.timing(heightAnim, {
        toValue: target,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) heightRef.current = target;
      });
    }
  }, [visible, shown, contentH, heightAnim]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      setContentH(h => (h > 0 ? h : Math.round(SCREEN_H * 0.55)));
    }, 400);
    return () => clearTimeout(timer);
  }, [visible]);

  const MAX_H = Math.round(SCREEN_H * 0.9);
  const MIN_H = contentH > 0 ? Math.min(contentH, MAX_H) : 0;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => visible,
    onMoveShouldSetPanResponder: (_, g) => visible && Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      if (!visible) return;
      heightAnim.stopAnimation(h => {
        dragStartH.current = h;
        heightRef.current = h;
      });
    },
    onPanResponderMove: (_, g) => {
      if (!visible) return;
      const lo = Math.min(MIN_H, dragStartH.current);
      const next = Math.max(lo, Math.min(MAX_H, dragStartH.current - g.dy));
      heightRef.current = next;
      heightAnim.setValue(next);
    },
    onPanResponderRelease: (_, g) => {
      if (!visible) return;
      if (Math.abs(g.dy) < 4 && Math.abs(g.vy) < 0.3) return;
      if (
        dragStartH.current <= MIN_H + 1 &&
        g.dy > 0 &&
        (g.dy > 70 || g.vy > 0.8)
      ) {
        onClose();
        return;
      }
      const h = heightRef.current;
      const target = Math.abs(h - MIN_H) <= Math.abs(h - MAX_H) ? MIN_H : MAX_H;
      Animated.spring(heightAnim, {
        toValue: target,
        useNativeDriver: false,
        bounciness: 5,
        speed: 16,
      }).start(({ finished }) => {
        if (finished) heightRef.current = target;
      });
    },
    onPanResponderTerminate: () => {
      if (!visible) return;
      const h = heightRef.current;
      const target = Math.abs(h - MIN_H) <= Math.abs(h - MAX_H) ? MIN_H : MAX_H;
      Animated.spring(heightAnim, {
        toValue: target,
        useNativeDriver: false,
      }).start();
    },
  });

  return (
    <Modal visible={shown} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.modalShell, { opacity: backdrop }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetLayer}
        >
          <Animated.View style={[styles.sheet, { height: heightAnim }]}>
            <View style={styles.grabber} {...pan.panHandlers}>
              <View style={styles.grabberBar} />
              <Text style={styles.sheetTitle}>{title}</Text>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={styles.sheetBody}
                onLayout={e => setContentH(e.nativeEvent.layout.height)}
              >
                {children}
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalShell: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 37, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetLayer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  grabber: {
    paddingTop: S.md,
    paddingBottom: S.sm,
    paddingHorizontal: S.xl,
  },
  grabberBar: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D7DEE7',
    marginBottom: S.sm,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.primary,
  },
  sheetBody: {
    paddingTop: S.sm,
    paddingHorizontal: S.xl,
    paddingBottom: S.xxl,
  },
});
