// Piccoli componenti grafici condivisi, nello stesso stile "chunky" di theme.ts.
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
      <T v="h2" style={{ textAlign: 'center' }}>{title}</T>
      {sub ? <T v="label" style={{ textAlign: 'center' }}>{sub}</T> : null}
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
  size = 220, strokeWidth = 20, progress, color = colors.lime, trackColor = colors.band, children,
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

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel, borderRadius: 24, borderWidth: 3, borderColor: '#6E4524', overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    borderBottomWidth: 4, borderBottomColor: '#D4B882', padding: space.md, alignItems: 'center', gap: 2,
  },
  band: {
    backgroundColor: colors.band, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  textButton: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12 },
});
