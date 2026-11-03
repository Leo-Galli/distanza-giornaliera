import { StyleSheet, View } from 'react-native';

import { colors, space } from '../theme';
import { Band, Button, Card, Icon, ProgressRing, T, TextButton } from '../ui';

export function TodayScreen({
  day, steps, stepsAvailable, goalSteps, distanceText, tracking, ready, status, details, onStart, onStop, onReset,
}: {
  day: string;
  steps: number;
  stepsAvailable: boolean;
  goalSteps: number;
  distanceText: string;
  tracking: boolean;
  ready: boolean;
  status: string;
  details: string;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const progress = Math.min(1, steps / goalSteps);

  return (
    <View style={styles.body}>
      <T v="label" style={{ textAlign: 'center' }}>{day}</T>

      <View style={styles.ringWrap}>
        <ProgressRing progress={progress} size={200} strokeWidth={18}>
          <Icon name="shoe-print" size={28} color={colors.lime} />
          <T v="huge" style={{ marginTop: 2 }}>{stepsAvailable ? steps.toLocaleString('it-IT') : '--'}</T>
          <T v="label">{stepsAvailable ? `passi · obiettivo ${goalSteps.toLocaleString('it-IT')}` : 'contapassi non disponibile'}</T>
        </ProgressRing>
      </View>

      <Card accent={colors.amber} style={{ width: '100%' }}>
        <Icon name="map-marker-distance" size={22} color={colors.amber} />
        <T v="big">{distanceText}</T>
        <T v="label">distanza percorsa (GPS)</T>
      </Card>

      <Band title={status} sub={tracking ? details : undefined} />

      <View style={{ height: space.sm }} />

      <Button label="AVVIA" color={colors.lime} disabled={tracking || !ready} onPress={onStart} />
      <View style={{ height: space.sm }} />
      <Button label="PAUSA" color={colors.violet} disabled={!tracking} onPress={onStop} />
      <TextButton label="Azzera i dati di oggi" onPress={onReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: space.lg, gap: space.md, alignItems: 'center' },
  ringWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm },
});
