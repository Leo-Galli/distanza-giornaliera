// Piccoli componenti grafici condivisi, nello stesso stile "chunky" di theme.ts.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, display, radius, shade, space, stickerShadow } from './theme';

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/* ------------------------------------------------------------------ testo */
type Variant = 'body' | 'title' | 'h2' | 'label' | 'big' | 'huge';
const textStyles: Record<Variant, TextStyle> = {
  body: { fontSize: 15, color: colors.text },
  title: { fontSize: 22, fontFamily: display, color: colors.text },
  h2: { fontSize: 17, fontFamily: display, color: colors.text },
  label: { fontSize: 13, color: colors.muted },
  big: { fontSize: 32, fontFamily: display, color: colors.text },
  huge: { fontSize: 56, fontFamily: display, color: colors.text },
};
export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <Text maxFontSizeMultiplier={1.4} {...rest} style={[textStyles[v], color ? { color } : null, style]} />;
}

/* ------------------------------------------------------------------ pannelli */
export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return (
    <View style={[styles.card, accent ? { borderColor: accent, borderBottomColor: shade(accent, -0.2) } : null, style]}>
      {children}
    </View>
  );
}

/** Fascia beige con titolo ed eventuale sottotitolo, usata per i messaggi di stato. */
export function Band({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.band}>
      <T v="h2" style={{ textAlign: 'center', flexShrink: 1, width: '100%' }}>{title}</T>
      {sub ? <T v="label" style={{ textAlign: 'center', flexShrink: 1, width: '100%' }}>{sub}</T> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ bottoni */
export function Button({
  label, onPress, color = colors.amber, disabled, small, style,
}: {
  label: string; onPress: () => void; color?: string; disabled?: boolean; small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const base = disabled ? '#D9CBAA' : color;
  const edge = disabled ? '#B9A885' : shade(color, -0.3);
  const fg = disabled ? colors.muted : '#FFFFFF';
  const r = small ? 12 : 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        { borderRadius: r, backgroundColor: edge, paddingBottom: pressed ? 2 : 5, marginTop: pressed ? 3 : 0 },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: base, borderRadius: r, minHeight: small ? 40 : 58, paddingHorizontal: small ? 14 : 18,
          alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: shade(base, 0.25),
        }}
      >
        <Text maxFontSizeMultiplier={1.3} style={[{ fontFamily: display, fontSize: small ? 15 : 19, color: fg }, !disabled && stickerShadow]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function TextButton({ label, onPress, color = colors.red }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={styles.textButton}
    >
      <T v="label" color={color} style={{ fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ anello di progresso passi */
export function ProgressRing({
  size = 220, strokeWidth = 20, progress, color = colors.lime, trackColor = colors.border, children,
}: {
  size?: number; strokeWidth?: number; progress: number; color?: string; trackColor?: string; children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ chip / badge */
export function Chip({ text, color = colors.muted, icon }: { text: string; color?: string; icon?: string }) {
  return (
    <View style={[styles.chip, { borderColor: `${color}88`, backgroundColor: `${color}22` }]}>
      {icon ? <Icon name={icon} size={14} color={shade(color, -0.2)} /> : null}
      <T v="label" color={shade(color, -0.2)} style={{ fontWeight: '700' }}>{text}</T>
    </View>
  );
}

export function Icon({ name, size = 20, color = colors.text }: { name: string; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name as never} size={size} color={color} />;
}

/** Selettore a segmenti (per l'obiettivo giornaliero, o per le schede). */
export function Segmented<K extends string>({
  options, value, onChange,
}: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={[styles.segItem, on ? { backgroundColor: colors.lime, borderBottomColor: shade(colors.lime, -0.3) } : null]}
          >
            <Text style={[{ fontFamily: display, fontSize: 13, color: on ? '#fff' : colors.muted }, on && stickerShadow]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Grafico a barre semplice (storico settimanale passi/distanza). */
export function BarChart({ bars, height = 110 }: { bars: { label: string; value: number; highlight?: boolean }[]; height?: number }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: height + 24, width: '100%' }}>
      {bars.map((b, i) => {
        const h = Math.max(4, (b.value / max) * height);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{ height, justifyContent: 'flex-end', width: '100%' }}>
              <View
                style={{
                  height: h, borderRadius: 6, backgroundColor: b.highlight ? colors.lime : colors.amber,
                  borderWidth: 1, borderColor: shade(b.highlight ? colors.lime : colors.amber, -0.25),
                }}
              />
            </View>
            <T v="label" style={{ fontSize: 11 }}>{b.label}</T>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ barra schede in basso */
export function TabBar<K extends string>({
  tabs, value, onChange,
}: { tabs: { key: K; label: string; icon: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(t.key);
            }}
            style={styles.tabItem}
          >
            <Icon name={t.icon} size={24} color={on ? colors.lime : colors.muted} />
            <T v="label" color={on ? colors.lime : colors.muted} style={{ fontWeight: on ? '700' : '400' }}>{t.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel, borderRadius: 24, borderWidth: 3, borderColor: '#6E4524', overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    borderBottomWidth: 4, borderBottomColor: '#D4B882', padding: space.md, alignItems: 'center', gap: 2,
    maxWidth: '100%',
  },
  band: {
    backgroundColor: colors.band, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, gap: 2, alignSelf: 'stretch', width: '100%', maxWidth: '100%', flexShrink: 1,
  },
  textButton: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'center',
  },
  seg: {
    flexDirection: 'row', gap: 6, backgroundColor: colors.band, borderRadius: 99, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  segItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 99,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row', borderTopWidth: 3, borderTopColor: colors.border, backgroundColor: colors.card,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 10 },
});
