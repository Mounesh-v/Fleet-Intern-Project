import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { C, S, R, T } from '../themeCompat';

/** @param {Record<string, any>} props */
export function Screen({ children, style = undefined }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}
/** @param {Record<string, any>} props */
export function SectionTitle({ title, action = undefined, onAction = undefined }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <TouchableOpacity onPress={onAction}><Text style={styles.action}>{action}</Text></TouchableOpacity> : null}
    </View>
  );
}
/** @param {Record<string, any>} props */
export function Card({ children, style = undefined }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
/** @param {Record<string, any>} props */
export function PrimaryButton({ title, onPress, style = undefined, disabled = undefined }) {
  return (
    <TouchableOpacity accessibilityRole="button" disabled={disabled} activeOpacity={0.82} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabled, style]}>
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}
/** @param {Record<string, any>} props */
export function OutlineButton({ title, onPress, style = undefined }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.outlineButton, style]}><Text style={styles.outlineButtonText}>{title}</Text></TouchableOpacity>;
}
/** @param {Record<string, any>} props */
export function Field({
  label,
  value,
  onChangeText,
  placeholder = undefined,
  keyboardType = undefined,
  multiline = undefined,
  secureTextEntry = undefined,
  right = undefined,
  autoCapitalize = undefined,
  autoCorrect = undefined,
  onSubmitEditing = undefined,
  returnKeyType = undefined,
}) {
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, multiline && styles.multilineField]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {right}
      </View>
    </View>
  );
}
/** @param {Record<string, any>} props */
export function Chip({ label, selected = undefined, onPress = undefined, tone = 'green' }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected, !selected && tone === 'orange' && { backgroundColor: C.softOrange }]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}
/** @param {Record<string, any>} props */
export function StatCard({ label, value, hint = undefined, tone = 'green', icon = undefined }) {
  const bg = tone === 'blue' ? C.softBlue : tone === 'orange' ? C.softOrange : tone === 'red' ? C.softRed : C.softGreen;
  const color = tone === 'blue' ? C.primary : tone === 'orange' ? C.warning : tone === 'red' ? C.danger : C.success;
  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: bg }]}><Text style={[styles.statIconText, { color }]}>{icon || '•'}</Text></View>
        {hint ? <Text style={[styles.statHint, { color }]}>{hint}</Text> : null}
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
/** @param {Record<string, any>} props */
export function Badge({ label, tone = 'green' }) {
  const color = tone === 'red' ? C.danger : tone === 'orange' ? C.warning : tone === 'blue' ? C.primary : C.success;
  const bg = tone === 'red' ? C.softRed : tone === 'orange' ? C.softOrange : tone === 'blue' ? C.softBlue : C.softGreen;
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color }]}>{label}</Text></View>;
}
/** @param {Record<string, any>} props */
export function EmptyState({ title, subtitle = undefined }) {
  return <View style={styles.empty}><Text style={styles.emptyIcon}>▤</Text><Text style={styles.emptyTitle}>{title}</Text>{subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}</View>;
}
/** @param {Record<string, any>} props */
export function Loading({ label = 'Loading…' }) {
  return <View style={styles.empty}><ActivityIndicator color={C.accentDark} /><Text style={styles.emptySubtitle}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background, paddingHorizontal: S.lg, paddingTop: S.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.lg, marginBottom: S.md },
  sectionTitle: { ...T.title, color: C.textPrimary, flexShrink: 1 },
  action: { ...T.label, color: C.primary, marginLeft: S.sm },
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  primaryButton: { minHeight: 50, paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: C.primary, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  outlineButton: { minHeight: 44, borderRadius: R.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.md },
  outlineButtonText: { color: C.textPrimary, fontWeight: '700' },
  fieldWrap: { marginBottom: S.md },
  label: { ...T.label, color: C.textPrimary, marginBottom: S.xs },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: R.md, backgroundColor: C.surface, paddingHorizontal: S.md },
  multilineField: { alignItems: 'flex-start' },
  input: { flex: 1, color: C.textPrimary, paddingVertical: S.md, fontSize: 15 },
  inputMultiline: { minHeight: 82, textAlignVertical: 'top' },
  chip: { paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginRight: S.sm },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: C.white },
  statCard: { flex: 1, minWidth: 140, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: S.md, marginRight: S.sm, marginBottom: S.sm },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md },
  statIcon: { width: 34, height: 34, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontWeight: '800' },
  statHint: { fontSize: 11, fontWeight: '800' },
  statValue: { fontSize: 19, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.textSecondary },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: S.sm, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: S.xl },
  emptyIcon: { fontSize: 30, color: C.textMuted, marginBottom: S.sm },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  emptySubtitle: { fontSize: 13, color: C.textSecondary, marginTop: S.xs, textAlign: 'center' },
});
