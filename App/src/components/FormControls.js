import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const pad = value => String(value).padStart(2, '0');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PALETTES = {
  admin: {
    navy: '#182535',
    yellow: '#F5B923',
    border: '#E9E0D2',
    text: '#292D32',
    muted: '#85858A',
    tint: '#FFF2DE',
    tintBorder: '#F1DCA6',
    stepEdge: '#E4DACB',
    placeholder: '#A9A49B',
    amber: '#B4770B',
    white: '#FFFFFF',
    submitText: '#FFFDFA',
  },
  driver: {
    navy: '#172F50',
    yellow: '#F5B923',
    border: '#E6EBF1',
    text: '#182B45',
    muted: '#8B9AAF',
    tint: '#FFF6DE',
    tintBorder: '#F1DCA6',
    stepEdge: '#D4DCE3',
    placeholder: '#8B9AAF',
    amber: '#B4770B',
    white: '#FFFFFF',
    submitText: '#FFFDFA',
  },
};

const toneOf = tone => (tone === 'driver' ? 'driver' : 'admin');

const buildStyles = p =>
  StyleSheet.create({
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: p.navy,
      marginBottom: 7,
    },
    ddTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.white,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      minHeight: 48,
    },
    ddTriggerOpen: {
      borderColor: p.navy,
    },
    ddIcon: {
      marginRight: 8,
    },
    ddValue: {
      fontSize: 14.5,
      fontWeight: '600',
      color: p.text,
      flex: 1,
      marginRight: 8,
    },
    ddPlaceholder: {
      color: p.placeholder,
      fontWeight: '400',
    },
    ddList: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      backgroundColor: p.white,
      overflow: 'hidden',
    },
    ddScroll: {
      maxHeight: 196,
    },
    ddItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    ddItemActive: {
      backgroundColor: p.tint,
    },
    ddItemText: {
      fontSize: 13.5,
      color: p.text,
      flex: 1,
    },
    ddItemTextActive: {
      fontWeight: '800',
      color: p.navy,
    },
    ddEmpty: {
      marginTop: 6,
      padding: 12,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      backgroundColor: p.white,
    },
    ddEmptyInline: {
      padding: 12,
    },
    ddEmptyText: {
      fontSize: 13,
      color: p.muted,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
      backgroundColor: p.white,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: p.text,
      padding: 0,
    },
    cal: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      backgroundColor: p.white,
      padding: 10,
    },
    calHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    calMonth: {
      fontSize: 13.5,
      fontWeight: '800',
      color: p.navy,
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekDay: {
      width: '14.2857%',
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '800',
      color: p.muted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cellSlot: {
      width: '14.2857%',
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    day: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayOn: {
      backgroundColor: p.yellow,
    },
    dayText: {
      fontSize: 13,
      fontWeight: '600',
      color: p.text,
    },
    dayTextOn: {
      fontWeight: '800',
      color: p.navy,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      backgroundColor: p.white,
      paddingHorizontal: 12,
    },
    inputBoxMulti: {
      alignItems: 'flex-start',
      paddingVertical: 10,
    },
    inputIcon: {
      marginRight: 8,
    },
    inputIconMulti: {
      marginTop: 2,
    },
    prefix: {
      fontSize: 14.5,
      fontWeight: '800',
      color: p.navy,
      marginRight: 6,
    },
    input: {
      flex: 1,
      fontSize: 14.5,
      color: p.text,
      paddingVertical: 12,
    },
    inputMulti: {
      minHeight: 78,
      textAlignVertical: 'top',
      paddingVertical: 0,
    },
    section: {
      backgroundColor: p.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.border,
      padding: 16,
      marginBottom: 14,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    sectionBadge: {
      minWidth: 32,
      height: 26,
      borderRadius: 8,
      backgroundColor: p.yellow,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    sectionBadgeText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: p.navy,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: p.navy,
      flexShrink: 1,
    },
    sectionBody: {
      gap: 12,
    },
    steps: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginBottom: 18,
    },
    stepItem: {
      alignItems: 'center',
      width: 96,
    },
    stepCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: p.stepEdge,
      backgroundColor: p.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCircleOn: {
      backgroundColor: p.yellow,
      borderColor: p.yellow,
    },
    stepNum: {
      fontSize: 13,
      fontWeight: '800',
      color: p.muted,
    },
    stepNumOn: {
      color: p.navy,
    },
    stepLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      color: p.muted,
      marginTop: 5,
    },
    stepLabelOn: {
      color: p.navy,
    },
    stepConn: {
      flex: 1,
      height: 2,
      borderRadius: 1,
      backgroundColor: p.stepEdge,
      marginTop: 14,
      marginHorizontal: 4,
    },
    stepConnOn: {
      backgroundColor: p.yellow,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: p.tint,
      borderWidth: 1,
      borderColor: p.tintBorder,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 13,
      marginBottom: 16,
    },
    bannerIcon: {
      marginRight: 8,
      marginTop: 1,
    },
    bannerText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color: p.navy,
    },
    submit: {
      backgroundColor: p.navy,
      borderRadius: 12,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginTop: 4,
    },
    submitOff: {
      opacity: 0.6,
    },
    submitText: {
      color: p.submitText,
      fontSize: 15,
      fontWeight: '800',
    },
  });

const STYLES = {
  admin: buildStyles(PALETTES.admin),
  driver: buildStyles(PALETTES.driver),
};

export function Dropdown({
  label,
  placeholder,
  emptyNote,
  value,
  options,
  onChange,
  open,
  onToggle,
  icon,
  tone,
}) {
  const P = PALETTES[toneOf(tone)];
  const styles = STYLES[toneOf(tone)];
  const selected = options.find(option => option.value === value);
  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.ddTrigger, open && styles.ddTriggerOpen]}
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label || 'option'}`}
      >
        {icon ? (
          <Ionicons name={icon} size={16} color={P.muted} style={styles.ddIcon} />
        ) : null}
        <Text
          style={[styles.ddValue, !selected && styles.ddPlaceholder]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={P.muted}
        />
      </TouchableOpacity>
      {open ? (
        options.length === 0 ? (
          <View style={styles.ddEmpty}>
            <Text style={styles.ddEmptyText}>{emptyNote}</Text>
          </View>
        ) : (
          <View style={styles.ddList}>
            <ScrollView
              style={styles.ddScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {options.map(option => {
                const active = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.ddItem, active && styles.ddItemActive]}
                    onPress={() => {
                      onChange(option.value);
                      onToggle();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.ddItemText, active && styles.ddItemTextActive]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={15} color={P.navy} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )
      ) : null}
    </View>
  );
}

export function SearchableSelect({
  label,
  placeholder,
  emptyNote,
  value,
  options,
  onChange,
  open,
  onToggle,
  tone,
}) {
  const P = PALETTES[toneOf(tone)];
  const styles = STYLES[toneOf(tone)];
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);
  const selected = options.find(option => option.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(option => option.label.toLowerCase().includes(q))
    : options;
  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.ddTrigger, open && styles.ddTriggerOpen]}
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label || 'option'}`}
      >
        <Ionicons name="search" size={16} color={P.muted} style={styles.ddIcon} />
        <Text
          style={[styles.ddValue, !selected && styles.ddPlaceholder]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={P.muted}
        />
      </TouchableOpacity>
      {open ? (
        <View style={styles.ddList}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={15} color={P.muted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Type to search…"
              placeholderTextColor={P.placeholder}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
          <ScrollView
            style={styles.ddScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={styles.ddEmptyInline}>
                <Text style={styles.ddEmptyText}>{emptyNote}</Text>
              </View>
            ) : (
              filtered.map(option => {
                const active = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.ddItem, active && styles.ddItemActive]}
                    onPress={() => {
                      onChange(option.value);
                      onToggle();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.ddItemText, active && styles.ddItemTextActive]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={15} color={P.navy} />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function DatePickerField({ label, value, onChange, tone }) {
  const P = PALETTES[toneOf(tone)];
  const styles = STYLES[toneOf(tone)];
  const [open, setOpen] = useState(false);
  const parse = raw => {
    const parts = String(raw || '').split('/');
    if (parts.length !== 3) return null;
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const initial = parse(value) || new Date();
  const [cursor, setCursor] = useState({
    y: initial.getFullYear(),
    m: initial.getMonth(),
  });

  useEffect(() => {
    if (!open) return;
    const d = parse(value) || new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }, [open, value]);

  const selectedDate = parse(value);
  const selectedDay =
    selectedDate &&
    selectedDate.getFullYear() === cursor.y &&
    selectedDate.getMonth() === cursor.m
      ? selectedDate.getDate()
      : null;

  const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const shift = delta => {
    setCursor(c => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.ddTrigger, open && styles.ddTriggerOpen]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label || 'date'}`}
      >
        <Ionicons name="calendar" size={16} color={P.navy} style={styles.ddIcon} />
        <Text
          style={[styles.ddValue, !value && styles.ddPlaceholder]}
          numberOfLines={1}
        >
          {value || 'DD/MM/YYYY'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={P.muted}
        />
      </TouchableOpacity>
      {open ? (
        <View style={styles.cal}>
          <View style={styles.calHead}>
            <TouchableOpacity onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={18} color={P.navy} />
            </TouchableOpacity>
            <Text style={styles.calMonth}>
              {MONTHS[cursor.m]} {cursor.y}
            </Text>
            <TouchableOpacity onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={18} color={P.navy} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekDay}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((d, i) => (
              <View key={`cell-${i}`} style={styles.cellSlot}>
                {d ? (
                  <TouchableOpacity
                    style={[styles.day, selectedDay === d && styles.dayOn]}
                    onPress={() => {
                      onChange(`${pad(d)}/${pad(cursor.m + 1)}/${cursor.y}`);
                      setOpen(false);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedDay === d }}
                  >
                    <Text
                      style={[styles.dayText, selectedDay === d && styles.dayTextOn]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder = '',
  keyboardType = 'default',
  multiline = false,
  icon = '',
  prefix = '',
  autoCapitalize = 'sentences',
  tone,
}) {
  const P = PALETTES[toneOf(tone)];
  const styles = STYLES[toneOf(tone)];
  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputBox, multiline && styles.inputBoxMulti]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={16}
            color={P.muted}
            style={[styles.inputIcon, multiline && styles.inputIconMulti]}
          />
        ) : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={P.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

export function SectionCard({ num, title, children, onLayout, tone }) {
  const styles = STYLES[toneOf(tone)];
  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{num}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function StepIndicator({ steps, active, onStepPress, tone }) {
  const styles = STYLES[toneOf(tone)];
  return (
    <View style={styles.steps}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 ? (
            <View style={[styles.stepConn, i <= active && styles.stepConnOn]} />
          ) : null}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => onStepPress(i)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: i === active }}
          >
            <View style={[styles.stepCircle, i <= active && styles.stepCircleOn]}>
              <Text style={[styles.stepNum, i <= active && styles.stepNumOn]}>
                {i + 1}
              </Text>
            </View>
            <Text
              style={[styles.stepLabel, i === active && styles.stepLabelOn]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
}

export function InfoBanner({ text, tone }) {
  const P = PALETTES[toneOf(tone)];
  const styles = STYLES[toneOf(tone)];
  return (
    <View style={styles.banner}>
      <Ionicons
        name="information-circle"
        size={17}
        color={P.amber}
        style={styles.bannerIcon}
      />
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
}

export function SubmitButton({ title, onPress, disabled, tone }) {
  const styles = STYLES[toneOf(tone)];
  return (
    <TouchableOpacity
      style={[styles.submit, disabled && styles.submitOff]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <Text style={styles.submitText}>{title}</Text>
    </TouchableOpacity>
  );
}
