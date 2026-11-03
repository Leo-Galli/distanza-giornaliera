import { ScrollView, StyleSheet, View } from 'react-native';

import { DayEntry, lastNDays } from '../historyStore';
import { colors, space } from '../theme';
import { BarChart, Card, Chip, T } from '../ui';

export function StatsScreen({
  history, goalSteps, streak, today,
}: {
  history: DayEntry[];
  goalSteps: number;
  streak: number;
  today: string;
}) {
  const last7 = lastNDays(history, 7, today);
  const totalSteps7 = last7.reduce((sum, d) => sum + d.steps, 0);
  const totalDistance7 = last7.reduce((sum, d) => sum + d.distanceM, 0);
  const bestDay = last7.reduce((best, d) => (d.steps > best.steps ? d : best), last7[0]);
  const daysOnGoal = last7.filter((d) => d.steps >= goalSteps).length;

  const distanceText =
    totalDistance7 >= 1000 ? `${(totalDistance7 / 1000).toFixed(1)} km` : `${totalDistance7.toFixed(0)} m`;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Chip text={`Serie: ${streak} ${streak === 1 ? 'giorno' : 'giorni'}`} color={colors.red} icon="fire" />

      <Card style={{ width: '100%' }}>
        <T v="h2">Ultimi 7 giorni · passi</T>
        <View style={{ height: space.sm }} />
        <BarChart bars={last7.map((d) => ({ label: d.label, value: d.steps, highlight: d.steps >= goalSteps }))} />
        <T v="label">{daysOnGoal} su 7 giorni con l’obiettivo raggiunto</T>
      </Card>

      <View style={styles.row}>
        <Card style={styles.half} accent={colors.teal}>
          <T v="label">Passi (7 gg)</T>
          <T v="big">{totalSteps7.toLocaleString('it-IT')}</T>
        </Card>
        <Card style={styles.half} accent={colors.amber}>
          <T v="label">Distanza (7 gg)</T>
          <T v="big">{distanceText}</T>
        </Card>
      </View>

      <Card style={{ width: '100%' }} accent={colors.violet}>
        <T v="label">Miglior giorno della settimana</T>
        <T v="big">{bestDay.steps.toLocaleString('it-IT')} passi</T>
        <T v="label">{bestDay.day}</T>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, alignItems: 'center', paddingBottom: space.xl },
  row: { flexDirection: 'row', gap: space.md, width: '100%' },
  half: { flex: 1 },
});
